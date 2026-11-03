// netlify/functions/api.js
const fetch = require('node-fetch'); // Add "node-fetch" in package.json if needed, or use native fetch (Node 18+)

const FOXSMS_API_KEY = "nvk_live_1Rch_I22jk5jE-ihWwGn8RoMwSyNx7jTJiz0Xg641Ew";
const FOXSMS_BASE = "https://foxsms.xyz/api/v2";
const PAYMENT_API_KEY = "PAY32DCCEEA3A215D6B8EE95122";
const UPI_ID = "paytm.s4fcxmz@pty"; // Aapki UPI ID

exports.handler = async (event, context) => {
    // Get path from url (e.g., /api/get-services)
    const path = event.path.replace('/.netlify/functions/api/', '');
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    try {
        // 1. FETCH SERVICES
        if (path === 'get-services') {
            const res = await fetch(`${FOXSMS_BASE}/sms/services?country=IN`, {
                headers: { "Authorization": `Bearer ${FOXSMS_API_KEY}` }
            });
            const data = await res.json();
            
            if (data.success) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, services: data.data.services })
                };
            }
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: "API Error" }) };
        }

        // 2. BUY NUMBER
        if (path === 'buy-number') {
            const body = JSON.parse(event.body);
            const res = await fetch(`${FOXSMS_BASE}/sms/order`, {
                method: 'POST',
                headers: { 
                    "Authorization": `Bearer ${FOXSMS_API_KEY}`,
                    "Content-Type": "application/json",
                    "Idempotency-Key": "bot_" + Date.now() // Prevent double charge
                },
                body: JSON.stringify({ country: "IN", service_code: body.service_code })
            });
            const data = await res.json();
            
            if (data.success) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, number: data.data.number, order_id: data.data.order_id })
                };
            }
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: data.error?.message || "Out of stock" }) };
        }

        // 3. CREATE PAYMENT QR
        if (path === 'create-payment') {
            const amount = event.queryStringParameters.amount;
            const txnid = "TXN" + Date.now();
            const upiUrl = `upi://pay?pa=${UPI_ID}&pn=SastaSMS&tr=${txnid}&am=${amount}&cu=INR`;
            const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiUrl)}&size=600&margin=2&dark=0b1120&light=ffffff`;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, txnid: txnid, qr_url: qrUrl })
            };
        }

        // 4. CHECK PAYMENT
        if (path === 'check-payment') {
            const txnid = event.queryStringParameters.txnid;
            const amount = event.queryStringParameters.amount;

            const apiUrl = `https://vcgatewaypro.com/payment_api.php?api_key=${PAYMENT_API_KEY}&order_id=${txnid}&amount=${amount}`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (data.status === 'success' || data.status === 'true') {
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }
            return { statusCode: 400, headers, body: JSON.stringify({ success: false }) };
        }

        // Default 404
        return { statusCode: 404, headers, body: JSON.stringify({ message: "Not Found" }) };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};