require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const twilio = require("twilio");
const dayjs = require("dayjs");

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const fromWhatsApp = "whatsapp:+14155238886"; // Replace with your Twilio WhatsApp number

// Function to check due payments
async function checkPayments() {
	const today = dayjs(); // Current date

	// Fetch clients with last_payment and pay_day fields
	let { data: clients, error } = await supabase
		.from("clients")
		.select("id, name, phone_number, last_payment, pay_day");

	if (error) {
		console.error("Error fetching clients:", error);
		return;
	}

	// Iterate through clients and determine if payment is due
	for (let client of clients) {
		const lastPaymentDate = dayjs(client.last_payment); // Last payment date
		const currentMonth = today.month(); // Current month (0-based index, January is 0)
		const currentYear = today.year();

		// Check if the current month and year are different from the last payment month/year
		const isNewMonth =
			lastPaymentDate.month() < currentMonth ||
			lastPaymentDate.year() < currentYear;

		// Check if today is past the pay_day
		const isPaymentDue = today.date() > client.pay_day;

		// If it's a new month and past the pay_day, the user has a due payment
		if (isNewMonth && isPaymentDue) {
			await sendWhatsAppMessage(client);
		}
	}
}

// Function to send WhatsApp message using Twilio
async function sendWhatsAppMessage(client) {
	const message = `Hello ${client.name}, this is a reminder that you have a due payment for this month. Please make the payment as soon as possible.`;

	// Send WhatsApp message
	try {
		const response = await client.messages.create({
			body: message,
			from: fromWhatsApp, // Twilio WhatsApp number
			to: `whatsapp:${client.phone}`, // Client's phone number
		});
		console.log(`Message sent to ${client.name} (${client.phone})`);
	} catch (error) {
		console.error(`Failed to send message to ${client.name}:`, error);
	}
}

// Run the job
checkPayments();
