import {UserService} from "../user/UserService.js";
import {PasswordService} from "../../infrastructure/security/PasswordService.js";
import {JwtService} from "../../infrastructure/security/JwtService.js";
import {AuthCacheRepository} from "../../infrastructure/repositories/cache/AuthCacheRepository.js";

import {UserDTO} from "../types/user.js";
import {TokensDTO, UserWithTokensDTO} from "../types/auth.js";

import {InvalidCredentialsError, InvalidTokenError} from "../../errors/index.js";

import {TokenType} from "../../enums/auth.js";
import {AuthMapper} from "./AuthMapper.js";
import {getErrorMessage} from "../../utils/error.js";

export class SessionAuthService {
	constructor(
		private readonly userService: UserService,
		private readonly passwordService: PasswordService,
		private readonly jwtService: JwtService,
		private readonly authCacheRepository: AuthCacheRepository
	) {}

	async login(email: string, password: string): Promise<UserWithTokensDTO> {
		const userEntityWithPassword = await this.userService.getEntityByEmailOrFail(email, {
			withPassword: true
		});

		const isMatch = await this.passwordService.comparePassword(
			password, userEntityWithPassword.hashedPassword
		);
		if (!isMatch) {
			throw new InvalidCredentialsError("Invalid credentials");
		}

		const { id: userId } = userEntityWithPassword;
		const { accessToken, refreshToken } = this.jwtService.generateTokens(userId);

		const userDTO = await this.userService.updateLastLogin(userId);

		await this.authCacheRepository.storeRefreshToken(userId, refreshToken)

		return AuthMapper.toUserWithTokensDTO(userDTO, accessToken, refreshToken);
	}

	async logout(refreshToken: string): Promise<void> {
		if (refreshToken) {
			try {
				const decoded = this.jwtService.verifyToken(refreshToken, TokenType.REFRESH_TOKEN);
				await this.authCacheRepository.removeRefreshToken(decoded.userId);
			}
			catch (error: unknown) {
				console.warn("Invalid refresh token during logout:", getErrorMessage(error));
			}
		}
	}

	async getProfile(userId: string): Promise<UserDTO> {
		return await this.userService.getByIdOrFail(userId);
	}

	async validateAccessToken(token: string): Promise<UserDTO> {
		const decoded = this.jwtService.verifyToken(token, TokenType.ACCESS_TOKEN);
		return await this.userService.getByIdOrFail(decoded.userId);
	}

	async refreshAccessToken(refreshToken: string): Promise<TokensDTO> {
		if (!refreshToken) {
			throw new InvalidTokenError("No refresh token provided");
		}

		const decoded = this.jwtService.verifyToken(refreshToken, TokenType.REFRESH_TOKEN);

		const { userId } = decoded;

		const storedToken = await this.authCacheRepository.getRefreshToken(userId);

		// 1. Reuse detection and invalidation
		if (!storedToken || storedToken !== refreshToken) {
			await this.authCacheRepository.invalidateAllSessions(userId);
			throw new InvalidTokenError("Refresh token not found or revoked (Possible session hijacking)");
		}

		await this.userService.getByIdOrFail(userId)

		// 2. Token rotation
		const tokens = this.jwtService.generateTokens(userId);
		await this.authCacheRepository.storeRefreshToken(userId, tokens.refreshToken);

		return tokens;
	}
}