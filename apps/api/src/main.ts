import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Controller()
class HealthController {
  @Get("live") live() {
    return { status: "live", service: "api" };
  }
  @Get("ready") ready() {
    return { status: "ready", service: "api", configVersion: "1" };
  }
}
@Module({ controllers: [HealthController] })
class AppModule {}
async function main() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0");
}
void main();
