import nextEnv from "@next/env";
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name}`);
  return value;
};

const productionOrigin = process.env.APP_ORIGIN?.trim()?.replace(/\/$/, "");
const allowedOrigins = [...new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  productionOrigin,
].filter(Boolean))];

const client = new S3Client({
  region: "auto",
  endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
});

await client.send(new PutBucketCorsCommand({
  Bucket: required("R2_BUCKET_NAME"),
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: allowedOrigins,
      AllowedMethods: ["GET", "HEAD", "PUT"],
      AllowedHeaders: ["Content-Type"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    }],
  },
}));

console.log(`CORS de R2 configurado para: ${allowedOrigins.join(", ")}`);
