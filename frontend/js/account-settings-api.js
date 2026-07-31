(function (root, factory) {
  const api = factory(root?.LoothoodAccountClient);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodAccountSettingsApi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (accountClient) {
  "use strict";

  const CLIENT = accountClient;

  function requiredClient() {
    if (!CLIENT?.secureIdempotencyKey || !CLIENT?.connectAndSign) {
      throw new Error("Loothood account client is unavailable.");
    }
    return CLIENT;
  }

  function messageId(value) {
    const id = String(value || "").trim();
    if (!/^[a-f0-9-]{36}$/i.test(id)) throw new TypeError("System message ID is invalid.");
    return encodeURIComponent(id);
  }

  class AccountSettingsApi {
    constructor({ api }) {
      if (!api?.request || !api?.csrfMutation) {
        throw new TypeError("Account & Settings API requires an authenticated AccountApi.");
      }
      this.api = api;
    }

    inspectSession() {
      return this.api.inspectSession();
    }

    loadMailbox({ includeArchived = false, limit = 100 } = {}) {
      const query = new URLSearchParams();
      if (includeArchived) query.set("includeArchived", "true");
      query.set("limit", String(limit));
      return this.api.request(`/api/v1/mailbox?${query}`);
    }

    loadUnreadCount() {
      return this.api.request("/api/v1/mailbox/unread-count");
    }

    markMailRead(id) {
      return this.api.csrfMutation(`/api/v1/mailbox/${messageId(id)}/read`, {
        method: "POST",
        body: {},
      });
    }

    archiveMail(id) {
      return this.api.csrfMutation(`/api/v1/mailbox/${messageId(id)}/archive`, {
        method: "POST",
        body: {},
      });
    }

    claimMail(id) {
      const client = requiredClient();
      return this.api.csrfMutation(`/api/v1/mailbox/${messageId(id)}/claim`, {
        method: "POST",
        body: {},
        idempotencyKey: client.secureIdempotencyKey(`mail-${id}`),
      });
    }

    reportBug(body) {
      return this.api.csrfMutation("/api/v1/feedback/bug-reports", {
        method: "POST",
        body,
      });
    }

    convertGuestWithUsername({ username, password, passwordConfirmation }) {
      const client = requiredClient();
      return this.api.csrfMutation("/api/v1/account/guest/convert/password", {
        method: "POST",
        body: { username, password, passwordConfirmation },
        idempotencyKey: client.secureIdempotencyKey("guest-password"),
      }).then((result) => this.api.rememberSession(result));
    }

    addUsername({ username, password, passwordConfirmation }) {
      return this.api.csrfMutation("/api/v1/account/methods/username", {
        method: "POST",
        body: { username, password, passwordConfirmation },
      }).then((result) => this.api.rememberSession(result));
    }

    logout() {
      return this.api.csrfMutation("/api/v1/account/logout", {
        method: "POST",
        body: {},
      });
    }

    logoutAll() {
      return this.api.csrfMutation("/api/v1/account/logout-all", {
        method: "POST",
        body: {},
      });
    }

    setupRecovery() {
      return this.api.csrfMutation("/api/v1/account/recovery/setup", {
        method: "POST",
        body: {},
      });
    }

    confirmRecovery(blocksByPosition) {
      return this.api.csrfMutation("/api/v1/account/recovery/confirm", {
        method: "POST",
        body: { blocksByPosition },
      }).then((result) => this.api.rememberSession(result));
    }

    async connectWallet(providerEntry, { guest = false, link = false } = {}) {
      const client = requiredClient();
      const prefix = guest
        ? "/api/v1/account/guest/convert/wallet"
        : link
          ? "/api/v1/account/methods/wallet/link"
          : "/api/v1/account/wallet";
      const signed = await client.connectAndSign(providerEntry, (address) => (
        this.api.csrfMutation(`${prefix}/challenge`, {
          method: "POST",
          body: { address },
        })
      ));
      const result = await this.api.csrfMutation(`${prefix}/verify`, {
        method: "POST",
        body: {
          challengeId: signed.challenge.challengeId,
          message: signed.challenge.message,
          signature: signed.signature,
        },
        idempotencyKey: client.secureIdempotencyKey(guest ? "guest-wallet" : "link-wallet"),
      });
      return this.api.rememberSession(result);
    }
  }

  return Object.freeze({
    AccountSettingsApi,
    messageId,
  });
});
