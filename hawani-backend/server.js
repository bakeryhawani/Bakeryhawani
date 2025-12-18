const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- Helper: Generate Access Token ---
const getAccessToken = async () => {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    try {
        const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Token Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate access token");
    }
};

// --- STK Push Endpoint ---
app.post('/pay', async (req, res) => {
    const { phone, amount } = req.body;

    try {
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
        
        // Password = base64.encode(Shortcode + Passkey + Timestamp)
        const password = Buffer.from(
            process.env.MPESA_SHORTCODE + 
            process.env.MPESA_PASSKEY + 
            timestamp
        ).toString('base64');

        const requestBody = {
            "BusinessShortCode": process.env.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": process.env.MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": process.env.CALLBACK_URL,
            "AccountReference": "HawaniBakers",
            "TransactionDesc": "Bakery Payment"
        };

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            requestBody,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        res.status(200).json(response.data);
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error("STK Push Error:", errorData);
        res.status(500).json({ error: "STK Push failed", details: errorData });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hawani Backend running on port ${PORT}`));