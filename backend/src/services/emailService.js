// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

// 1. Configuramos el "transporter" (el motor de envío) usando los datos del .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // false para el puerto 587 (usa TLS). Sería true si usaras el puerto 465.
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 2. Creamos la función que arma y envía el correo
const enviarMailInvitacion = async (emailDestino, nombreUsuario, urlActivacion) => {
  try {
    // Estructura HTML del correo (podés personalizar colores y textos a tu gusto)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; text-align: center;">¡Te damos la bienvenida a Consorcia!</h2>
        <p style="color: #475569; font-size: 16px;">Hola <strong>${nombreUsuario}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          La administración ha creado tu cuenta. Para poder ingresar a la aplicación y configurar tu contraseña de acceso, hacé clic en el siguiente botón:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlActivacion}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
            Activar mi Cuenta
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Este enlace es de un solo uso y expirará en 24 horas.<br>
          Si el botón no funciona, podés copiar y pegar este enlace en tu navegador:<br>
          <a href="${urlActivacion}" style="color: #3b82f6; word-break: break-all;">${urlActivacion}</a>
        </p>
      </div>
    `;

    // 3. Ejecutamos el envío a través de Gmail
    const info = await transporter.sendMail({
      from: '"Consorcia Administración" <no-reply@consorcia.app>', // Remitente
      to: emailDestino,                                            // Destinatario
      subject: 'Activación de cuenta - Consorcia',                 // Asunto del mail
      html: htmlContent,                                           // Cuerpo del mail
    });

    console.log(`✉️ Mail enviado con éxito a ${emailDestino} (ID: ${info.messageId})`);
    return true;

  } catch (error) {
    console.error('❌ Error enviando el mail de invitación:', error);
    // Lanzamos el error para que el controlador se entere si algo falló
    throw new Error('No se pudo enviar el correo de activación'); 
  }
};

module.exports = {
  enviarMailInvitacion
};