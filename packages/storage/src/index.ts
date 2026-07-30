import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectLegalHoldCommand,
  PutObjectTaggingCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

export type ObjectRef = Readonly<{
  version: "1";
  tenantId: string;
  objectId: string;
}>;
export interface ObjectStorage {
  put(tenantId: string, stream: Readable): Promise<ObjectRef>;
  getStream(tenantId: string, ref: ObjectRef): Promise<Readable>;
  head(tenantId: string, ref: ObjectRef): Promise<{ size: number }>;
  delete(tenantId: string, ref: ObjectRef): Promise<void>;
  sign(
    tenantId: string,
    ref: ObjectRef,
    method: "GET" | "PUT",
    purpose: string,
    expiresSeconds: number,
  ): Promise<string>;
  health(): Promise<{ ready: boolean }>;
  setLifecycle(
    ref: ObjectRef,
    tags: Readonly<Record<string, string>>,
  ): Promise<void>;
  setLegalHold(ref: ObjectRef, enabled: boolean): Promise<void>;
}
export type S3StorageConfiguration = Readonly<{
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}>;

export function opaqueKey(ref: ObjectRef): string {
  if (
    !/^[0-9a-f-]{36}$/i.test(ref.tenantId) ||
    !/^[0-9a-f-]{36}$/i.test(ref.objectId)
  )
    throw new Error("STORAGE_REF_INVALID");
  return `tenants/${ref.tenantId}/objects/${ref.objectId}`;
}

export class S3CompatibleStorage implements ObjectStorage {
  protected readonly client: S3Client;
  constructor(protected readonly configuration: S3StorageConfiguration) {
    this.client = new S3Client({
      endpoint: configuration.endpoint,
      region: configuration.region,
      ...(configuration.forcePathStyle === undefined
        ? {}
        : { forcePathStyle: configuration.forcePathStyle }),
      credentials: {
        accessKeyId: configuration.accessKeyId,
        secretAccessKey: configuration.secretAccessKey,
      },
    });
  }
  async put(tenantId: string, stream: Readable): Promise<ObjectRef> {
    const ref: ObjectRef = { version: "1", tenantId, objectId: randomUUID() };
    await new Upload({
      client: this.client,
      params: {
        Bucket: this.configuration.bucket,
        Key: opaqueKey(ref),
        Body: stream,
      },
    }).done();
    return ref;
  }
  async getStream(tenantId: string, ref: ObjectRef): Promise<Readable> {
    this.assertTenant(tenantId, ref);
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.configuration.bucket,
          Key: opaqueKey(ref),
        }),
      );
      if (!(response.Body instanceof Readable))
        throw new Error("STORAGE_STREAM_INVALID");
      return response.Body;
    } catch {
      throw new Error("STORAGE_NOT_FOUND");
    }
  }
  async head(tenantId: string, ref: ObjectRef): Promise<{ size: number }> {
    this.assertTenant(tenantId, ref);
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.configuration.bucket,
          Key: opaqueKey(ref),
        }),
      );
      return { size: response.ContentLength ?? 0 };
    } catch {
      throw new Error("STORAGE_NOT_FOUND");
    }
  }
  async delete(tenantId: string, ref: ObjectRef): Promise<void> {
    this.assertTenant(tenantId, ref);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.configuration.bucket,
        Key: opaqueKey(ref),
      }),
    );
  }
  async health(): Promise<{ ready: boolean }> {
    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.configuration.bucket }),
      );
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }
  async setLifecycle(
    ref: ObjectRef,
    tags: Readonly<Record<string, string>>,
  ): Promise<void> {
    await this.client.send(
      new PutObjectTaggingCommand({
        Bucket: this.configuration.bucket,
        Key: opaqueKey(ref),
        Tagging: {
          TagSet: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
        },
      }),
    );
  }
  async setLegalHold(ref: ObjectRef, enabled: boolean): Promise<void> {
    await this.client.send(
      new PutObjectLegalHoldCommand({
        Bucket: this.configuration.bucket,
        Key: opaqueKey(ref),
        LegalHold: { Status: enabled ? "ON" : "OFF" },
      }),
    );
  }
  async sign(
    tenantId: string,
    ref: ObjectRef,
    method: "GET" | "PUT",
    purpose: string,
    expiresSeconds: number,
  ) {
    this.assertTenant(tenantId, ref);
    if (!purpose || expiresSeconds < 1 || expiresSeconds > 300)
      throw new Error("STORAGE_SIGN_SCOPE_INVALID");
    const command =
      method === "GET"
        ? new GetObjectCommand({
            Bucket: this.configuration.bucket,
            Key: opaqueKey(ref),
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(purpose)}"`,
          })
        : new PutObjectCommand({
            Bucket: this.configuration.bucket,
            Key: opaqueKey(ref),
            Metadata: { purpose },
          });
    return getSignedUrl(this.client, command, { expiresIn: expiresSeconds });
  }
  protected assertTenant(tenantId: string, ref: ObjectRef) {
    if (tenantId !== ref.tenantId) throw new Error("STORAGE_NOT_FOUND");
  }
}
export class MinioStorage extends S3CompatibleStorage {}
export class R2Storage extends S3CompatibleStorage {}
