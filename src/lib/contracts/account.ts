// The account, as its owner sees it (M-account: GET /account · PATCH /account/consent ·
// DELETE /account).
//
// Deliberately small. Nothing here identifies anyone but the person asking, and nothing a
// client could set that the server would trust — the email is decided at sign-up and the
// verified flag by the mail we sent, so both are read-only facts rather than fields.

export interface AccountResponse {
  email: string;
  emailVerified: boolean;
  /** Off by default, and consent cannot be retrofitted — see PATCH /account/consent. */
  trainingOptIn: boolean;
  createdAt: string;
}

// PATCH /account/consent — the one thing on this page that is the owner's to change.
export interface ConsentRequest {
  trainingOptIn: boolean;
}

// DELETE /account. Returns nothing useful: by the time it answers, the account it would
// describe is gone.
export interface DeleteAccountResponse {
  deleted: true;
}
