import {Response} from "express";

import {CookieTokenType, SameSiteCookieOption} from "../../enums/auth.js";
import {DateTime} from "../../utils/dateTime.js";

interface CookieOptions {
	httpOnly: boolean;
	secure: boolean;
	sameSite: SameSiteCookieOption;
	maxAge: number;
	path: string;
	partitioned: boolean;
}

export class AuthCookieManager {
	private readonly isProduction: boolean;
	private readonly forceDisableSecureCookies: boolean;
	private readonly sameSite: SameSiteCookieOption;
	private readonly accessTokenMaxAge: number;
	private readonly refreshTokenMaxAge: number;

	constructor(refreshTokenTtl: string, isProduction: boolean, forceDisableSecureCookies: boolean) {
		this.isProduction = isProduction;
		this.forceDisableSecureCookies = forceDisableSecureCookies;

		// Access cookie lifetime matches refresh cookie lifetime
		// (not to confuse with jwt ttl for access and refresh, they are different).
		// This is to prevent browser from invalidating access token and
		// not including it in the request, when it should be
		const ttlMs = DateTime.ttlToMilliseconds(refreshTokenTtl);
		this.accessTokenMaxAge = ttlMs;
		this.refreshTokenMaxAge = ttlMs;

		this.sameSite = (this.isProduction && !forceDisableSecureCookies)
			? SameSiteCookieOption.NONE
			: SameSiteCookieOption.LAX;
	}

	/**
	 * Helper to configure standard HTTP-only cookie options.
	 */
	private getCookieOptions(maxAge: number): CookieOptions {
		// Auth tokens must be HTTP-only and secure in production
		return {
			httpOnly: true,
			secure: this.forceDisableSecureCookies ? false : this.isProduction,
			sameSite: this.sameSite,
			maxAge: maxAge,
			path: "/",
			partitioned: this.isProduction && !this.forceDisableSecureCookies,
		}
	}

	/**
	 * Returns the base options required when clearing a cookie (must match settings used when setting it).
	 */
	private getBaseClearOptions(): Omit<CookieOptions, "maxAge"> {
		return {
			httpOnly: true,
			secure: this.forceDisableSecureCookies ? false : this.isProduction,
			sameSite: this.sameSite,
			path: "/",
			partitioned: this.isProduction && !this.forceDisableSecureCookies
		};
	}

	setAccessToken(res: Response, accessToken: string): void {
		res.cookie(CookieTokenType.ACCESS_TOKEN, accessToken, this.getCookieOptions(this.accessTokenMaxAge));
	}

	setRefreshToken(res: Response, refreshToken: string): void {
		res.cookie(CookieTokenType.REFRESH_TOKEN, refreshToken, this.getCookieOptions(this.refreshTokenMaxAge));
	}

	setTokens(res: Response, accessToken: string, refreshToken: string): void {
		this.setAccessToken(res, accessToken);
		this.setRefreshToken(res, refreshToken);
	}

	clearTokens(res: Response): void {
		const baseOptions = this.getBaseClearOptions();

		res.clearCookie(CookieTokenType.ACCESS_TOKEN, baseOptions);
		res.clearCookie(CookieTokenType.REFRESH_TOKEN, baseOptions);
	}
}