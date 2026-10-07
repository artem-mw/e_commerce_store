import mongoose from "mongoose";
import {Redis, RedisOptions} from "ioredis";
import {MailtrapClient} from "mailtrap";
import nodemailer from "nodemailer";
import Stripe from "stripe";

import {Container} from "../Container.js";

import {IDatabaseProvider} from "../../../infrastructure/providers/database/IDatabaseProvider.js";
import {ICacheProvider} from "../../../infrastructure/providers/cache/ICacheProvider.js";
import {IStorageProvider} from "../../../infrastructure/providers/storage/IStorageProvider.js";
import {IEmailProvider} from "../../../infrastructure/providers/email/IEmailProvider.js";
import {IPaymentProvider} from "../../../infrastructure/providers/payment/IPaymentProvider.js";

import {MongooseDatabaseProvider} from "../../../infrastructure/providers/database/MongooseDatabaseProvider.js";
import {RedisCacheProvider} from "../../../infrastructure/providers/cache/RedisCacheProvider.js";
import {MemoryCacheProvider} from "../../../infrastructure/providers/cache/MemoryCacheProvider.js";
import {
    CloudinaryConfigOptions,
    CloudinaryStorageProvider
} from "../../../infrastructure/providers/storage/CloudinaryStorageProvider.js";
import {MailTrapEmailProvider} from "../../../infrastructure/providers/email/MailTrapEmailProvider.js";
import {NodemailerEmailProvider} from "../../../infrastructure/providers/email/NodemailerEmailProvider.js";
import {StripeProvider} from "../../../infrastructure/providers/payment/StripeProvider.js";

import {EmailSender} from "../../../infrastructure/providers/email/types.js";

import {CacheType, EmailType} from "../../../enums/infrastructure.js";

import {config} from "../../../config.js";

const registerProviders = (container: Container): void => {
    // DATABASE
    //=======================
    container.register({
        token: IDatabaseProvider,
        implementation: MongooseDatabaseProvider
    }, [
        mongoose,
        config.infrastructure.providers.database.mongo.uri,
        config.server.isProduction
    ]);

    // CACHE
    //=======================
    const redisUrl = config.infrastructure.providers.cache.redis.url;

    const redisOptions: RedisOptions = {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        ...(redisUrl.startsWith("rediss://")) && {
            tls: { rejectUnauthorized: false }
        },
        retryStrategy(times: number): number | null {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
        }
    };

    const redisClient = new Redis(
        redisUrl,
        redisOptions
    );

    const cacheType = config.infrastructure.providers.cache.type;
    const cacheImpl = cacheType === CacheType.REDIS
        ? RedisCacheProvider
        : MemoryCacheProvider;
    const cacheDeps = cacheType === CacheType.REDIS
        ? [redisClient]
        : [];

    container.register({
        token: ICacheProvider,
        implementation: cacheImpl as any
    }, cacheDeps);

    // EMAIL
    //=======================
    const mailtrapClient = new MailtrapClient({
        token: config.infrastructure.providers.email.mailtrap.token,
    });
    const nodemailerClient = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: config.infrastructure.providers.email.gmail.user,
            pass: config.infrastructure.providers.email.gmail.pass
        }
    });

    const emailType = config.infrastructure.providers.email.type;
    const emailImpl = emailType === EmailType.MAILTRAP
        ? MailTrapEmailProvider
        : NodemailerEmailProvider;
    const emailDeps = emailType === EmailType.MAILTRAP
        ? [
            mailtrapClient,
            {
                email: config.infrastructure.providers.email.mailtrap.sender.email,
                name: config.infrastructure.providers.email.senderName
            } satisfies EmailSender
        ]
        : [
            nodemailerClient,
            {
                email: config.infrastructure.providers.email.gmail.user,
                name: config.infrastructure.providers.email.senderName
            } satisfies EmailSender
        ];

    container.register({
        token: IEmailProvider,
        implementation: emailImpl as any
    }, emailDeps);

    // STORAGE
    //=======================
    container.register({
        token: IStorageProvider,
        implementation: CloudinaryStorageProvider
    }, [
        {
            cloudName: config.infrastructure.providers.storage.cloudinary.cloudName,
            apiKey: config.infrastructure.providers.storage.cloudinary.apiKey,
            apiSecret: config.infrastructure.providers.storage.cloudinary.apiSecret,
        } satisfies CloudinaryConfigOptions,
        config.server.isProduction
    ]);

    // PAYMENT
    //=======================
    const stripe = new Stripe(config.infrastructure.providers.payment.stripe.secretKey);

    const {clientUrl} = config.server;
    const {successUrl, cancelUrl} = config.infrastructure.providers.payment.stripe;
    const formURL = (input: string, base: string) => new URL(input, base).toString();

    container.register({
        token: IPaymentProvider,
        implementation: StripeProvider
    }, [
        stripe,
        config.infrastructure.providers.payment.stripe.webhookSecret,
        formURL(successUrl, clientUrl),
        formURL(cancelUrl, clientUrl)
    ]);
}

export default registerProviders;