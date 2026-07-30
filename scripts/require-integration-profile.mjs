if (
  process.env.SIROMIX_ENV !== "test" ||
  process.env.SIROMIX_INTEGRATION !== "1"
) {
  console.error(
    "INTEGRATION_PROFILE_REQUIRED: set SIROMIX_ENV=test and SIROMIX_INTEGRATION=1",
  );
  process.exit(1);
}
