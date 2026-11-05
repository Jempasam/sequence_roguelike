import { createHmac, timingSafeEqual } from "node:crypto"

/** How long credentials stay valid once handed out, in seconds: long enough for a whole game. */
const DEFAULT_LIFETIME = 12 * 60 * 60

/** A username: when it expires, in Unix seconds, then whom it was handed to. */
const USERNAME = /^(\d+)-([a-z0-9]+)$/

/** A username and the password that goes with it, for a TURN server. */
export interface TurnCredential {
    readonly username: string
    readonly credential: string
}

/**
 * The time-limited TURN credentials the signaling server hands each session, and the TURN server checks
 * without keeping any list: the password is a HMAC of the username under a secret only the two share, and
 * the username carries its own expiry.
 *
 * @remarks
 * The usual scheme writes `expiry:name` and a base64 password, but node-datachannel passes credentials
 * inside the URL (`turn:user:password@host`), which a `:`, `/` or `+` would break. The username uses `-`
 * and the password is hexadecimal.
 */
export class TurnCredentials {


    constructor(
        /** The secret shared by the signaling and the TURN servers. */
        secret: string,

        /** How long credentials stay valid once handed out, in seconds. */
        public readonly lifetime = DEFAULT_LIFETIME,
    ){
        if(secret.length < 16) throw new Error("The TURN secret must be at least 16 characters long.")
        this.#secret = secret
    }


    /**
     * Credentials for someone, valid from now on for {@link TurnCredentials.lifetime}.
     *
     * @param holder - Whom they are for, in lowercase letters and digits: a session id.
     * @param now - The current time, in milliseconds.
     */
    public issue(holder: string, now = Date.now()): TurnCredential {
        if(!/^[a-z0-9]+$/.test(holder)) throw new Error(`A holder of TURN credentials is lowercase letters and digits, not "${holder}".`)
        const expiry = Math.floor(now / 1000) + this.lifetime
        const username = `${expiry}-${holder}`
        return { username, credential: this.#passwordOf(username) }
    }

    /**
     * The password of a username, none when the username was not issued here or has expired.
     *
     * @param now - The current time, in milliseconds.
     */
    public passwordOf(username: string, now = Date.now()): string|null {
        const match = USERNAME.exec(username)
        if(!match) return null
        const isExpired = Number(match[1]) * 1000 < now
        return isExpired ? null : this.#passwordOf(username)
    }

    /** Is this the password of this username? Compared in constant time. */
    public check(username: string, password: string, now = Date.now()): boolean {
        const expected = this.passwordOf(username, now)
        if(expected === null || expected.length !== password.length) return false
        return timingSafeEqual(Buffer.from(expected), Buffer.from(password))
    }

    /** The holder a username was issued to, none when it is no username issued here. */
    public holderOf(username: string): string|null {
        return USERNAME.exec(username)?.[2] ?? null
    }


    readonly #secret: string

    #passwordOf(username: string): string {
        return createHmac("sha1", this.#secret).update(username).digest("hex")
    }
}
