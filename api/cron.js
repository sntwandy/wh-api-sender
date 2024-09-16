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

// Función para verificar pagos vencidos
async function checkPayments() {
  const today = dayjs(); // Fecha actual

  // Obtener clientes con los campos last_payment y pay_day
  let { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, phone_number, last_payment, pay_day");

  if (error) {
    console.error("Error al obtener los clientes:", error);
    return;
  }

  // Iterar sobre los clientes y determinar si el pago está vencido
  for (let client of clients) {
    const lastPaymentDate = dayjs(client.last_payment); // Fecha del último pago
    const currentMonth = today.month(); // Mes actual (índice basado en 0, enero es 0)
    const currentYear = today.year();

    // Verificar si el mes y el año actuales son diferentes del mes/año del último pago
    const isNewMonth =
      lastPaymentDate.month() < currentMonth ||
      lastPaymentDate.year() < currentYear;

    // Verificar si la fecha actual está después del día de pago
    const isPaymentDue = today.date() > client.pay_day;

    // Si es un nuevo mes y estamos después del día de pago, el pago está vencido
    if (isNewMonth && isPaymentDue) {
      try {
        const daysLate = today.diff(lastPaymentDate, 'day'); // Días de atraso
        await sendWhatsAppMessage(client, daysLate);
      } catch (error) {
        console.error(`Error al enviar mensaje para el cliente ${client.name}:`, error);
      }
    }
  }
}

// Función para enviar un mensaje de WhatsApp usando Twilio
async function sendWhatsAppMessage(user_client, daysLate) {
  const message = `Hola ${user_client.name}, le hablamos de Hard Training, este es un recordatorio de que tiene un pago vencido de ${daysLate} días. Por favor, realice el pago lo antes posible para evitar inconvenientes.`;

  // Enviar mensaje de WhatsApp
  try {
    const response = await client.messages.create({
      body: message,
      from: fromWhatsApp, // Número de WhatsApp de Twilio
      to: `whatsapp:${user_client.phone_number}`, // Número de teléfono del cliente
    });
    console.log(
      `Mensaje enviado a ${user_client.name} (${user_client.phone_number})`
    );
  } catch (error) {
    console.error(`Error al enviar mensaje a ${user_client.name}:`, error);
  }
}

// Ejecutar la tarea
checkPayments();