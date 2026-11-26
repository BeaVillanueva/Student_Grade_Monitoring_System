/** Present schema defaults without exposing implementation terms such as NaN. */
export function validationFeedback(message: unknown): string | undefined {
  if (typeof message !== "string" || !message) return undefined;
  if (message.startsWith("Invalid input:"))
    return "Enter a valid value for this field.";
  if (message.startsWith("Invalid option:"))
    return "Choose one of the available options.";
  return message;
}
