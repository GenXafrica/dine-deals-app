/**
 * Obsolete frontend welcome email helper.
 * Live welcome emails are queued by database triggers and sent by the shared worker.
 */

export const sendWelcomeEmail = async () => {
  return;
};

export default { sendWelcomeEmail };