type DeliveryResult = { sent: number; failed: number }

// Match the existing server limit without silently dropping selected recipients.
// Never retry a request automatically: sending replaces a participant's code.
export async function sendInvitationBatches(
  ids: string[],
  send: (ids: string[]) => Promise<DeliveryResult>
): Promise<DeliveryResult> {
  const recipients = [...new Set(ids)]
  const total = { sent: 0, failed: 0 }
  for (let offset = 0; offset < recipients.length; offset += 50) {
    const batch = recipients.slice(offset, offset + 50)
    try {
      const result = await send(batch)
      if (
        !result ||
        !Number.isInteger(result.sent) ||
        !Number.isInteger(result.failed) ||
        result.sent < 0 ||
        result.failed < 0 ||
        result.sent + result.failed !== batch.length
      )
        throw new Error("Incomplete delivery result")
      total.sent += result.sent
      total.failed += result.failed
    } catch {
      const remaining = recipients.length - offset - batch.length
      throw new Error(
        `${total.sent} access codes confirmed sent; ${total.failed} failed. ` +
          `Delivery to the next ${batch.length} participants could not be confirmed. ` +
          `${remaining} remaining participants were not attempted. ` +
          "Check invitation statuses and email delivery before retrying."
      )
    }
  }
  return total
}
