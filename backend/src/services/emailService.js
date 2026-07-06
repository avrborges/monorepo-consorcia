// backend/src/services/emailService.js
const nodemailer = require("nodemailer");

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Convierte strings tipo "true" / "false" a boolean.
 */
const parseBoolean = (value) => {
  return String(value).toLowerCase() === "true";
};

/**
 * Escapa texto dinámico que se inyecta en HTML.
 */
const escaparHtml = (valor) => {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Valida las variables mínimas SMTP.
 */
const validarConfiguracionSmtp = () => {
  const variablesObligatorias = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
  ];

  const faltantes = variablesObligatorias.filter(
    (variable) => !process.env[variable]
  );

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables SMTP en .env: ${faltantes.join(", ")}`
    );
  }
};

/**
 * Obtiene el remitente.
 *
 * Opcional en .env:
 * SMTP_FROM="Consorcia Administración <tu_correo@gmail.com>"
 */
const obtenerRemitente = () => {
  return (
    process.env.SMTP_FROM ||
    `"Consorcia Administración" <${process.env.SMTP_USER}>`
  );
};

/* ============================================================
 * CONFIGURACIÓN SMTP
 * ============================================================ */

validarConfiguracionSmtp();

const smtpPort = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: process.env.SMTP_SECURE
    ? parseBoolean(process.env.SMTP_SECURE)
    : smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ============================================================
 * TEMPLATES
 * ============================================================ */

const generarHtmlInvitacion = ({ nombreUsuario, urlActivacion }) => {
  const nombreSeguro = escaparHtml(nombreUsuario || "Usuario");
  const urlSegura = escaparHtml(urlActivacion);
  const year = new Date().getFullYear();

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Activación de cuenta - Consorcia</title>
  </head>

  <body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, Helvetica, sans-serif;">
    <div style="max-width:600px; margin:0 auto; padding:24px;">
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">

        <div style="background:#0b132b; padding:28px 24px; text-align:center;">
          <div style="font-size:24px; font-weight:800; letter-spacing:2px; color:#ffffff;">
            CONSOR<span style="color:#fca311;">CIA</span>
          </div>

          <p style="margin:8px 0 0; color:#94a3b8; font-size:12px; letter-spacing:1px; text-transform:uppercase;">
            Gestión Inteligente
          </p>
        </div>

        <div style="padding:28px 24px;">
          <h2 style="margin:0 0 16px; color:#0f172a; font-size:22px; text-align:center;">
            ¡Te damos la bienvenida a Consorcia!
          </h2>

          <p style="color:#475569; font-size:16px; margin:0 0 14px;">
            Hola <strong>${nombreSeguro}</strong>,
          </p>

          <p style="color:#475569; font-size:14px; line-height:1.6; margin:0;">
            La administración ha creado tu cuenta. Para ingresar a la aplicación y configurar tu contraseña de acceso, hacé clic en el siguiente botón:
          </p>

          <div style="text-align:center; margin:32px 0;">
            <a href="${urlSegura}" target="_blank" rel="noopener noreferrer" style="background-color:#0f172a; color:#ffffff; padding:13px 24px; text-decoration:none; font-weight:bold; border-radius:10px; display:inline-block; font-size:14px;">
              Activar mi cuenta
            </a>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px;">
            <p style="color:#64748b; font-size:12px; line-height:1.5; margin:0; text-align:center;">
              Este enlace es de un solo uso y expirará en <strong>24 horas</strong>.
            </p>
          </div>

          <p style="color:#94a3b8; font-size:12px; line-height:1.5; text-align:center; margin:20px 0 0;">
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:
            <br />  <p style="margin:0; color:#94a3b8; font-size:11px;">
            © ${year} CONSORCIA • by ARTHEMYSA
          </p>
        </div>

      </div>
    </div>
  </body>
</html>
  `;
};

const generarTextoInvitacion = ({ nombreUsuario, urlActivacion }) => {
  return `
Hola ${nombreUsuario || "Usuario"},

La administración ha creado tu cuenta en Consorcia.

Para activar tu cuenta y configurar tu contraseña, ingresá al siguiente enlace:

${urlActivacion}

Este enlace es de un solo uso y expirará en 24 horas.

Si no solicitaste esta invitación, podés ignorar este mensaje.

CONSORCIA
Gestión Inteligente
  `.trim();
};

/* ============================================================
 * SERVICIO: ENVIAR INVITACIÓN
 * ============================================================ */

const enviarMailInvitacion = async (
  emailDestino,
  nombreUsuario,
  urlActivacion
) => {
  try {
    if (!emailDestino) {
      throw new Error("No se indicó el destinatario del correo.");
    }

    if (!urlActivacion) {
      throw new Error("No se indicó la URL de activación.");
    }

    const htmlContent = generarHtmlInvitacion({
      nombreUsuario,
      urlActivacion,
    });

    const textContent = generarTextoInvitacion({
      nombreUsuario,
      urlActivacion,
    });

    const info = await transporter.sendMail({
      from: obtenerRemitente(),
      to: emailDestino,
      subject: "Activación de cuenta - Consorcia",
      html: htmlContent,
      text: textContent,
    });

    console.log(
      `Mail enviado con éxito a ${emailDestino} (ID: ${info.messageId})`
    );

    return true;
  } catch (error) {
    console.error("Error enviando el mail de invitación:", error);

    throw new Error("No se pudo enviar el correo de activación.");
  }
};

module.exports = {
  enviarMailInvitacion,
};