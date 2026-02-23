import { jest } from "@jest/globals";

describe("intelligence model catalog route", () => {
  afterEach(() => {
    delete process.env.INTELLIGENCE_MODEL_CATALOG_URL;
    jest.resetModules();
  });

  it("returns bundled fallback catalog when remote catalog is not configured", async () => {
    const { GET } = await import("@/app/api/intelligence/models/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.models.length).toBeGreaterThan(0);
    expect(payload.defaults.autoLowEnd).toBeDefined();
    expect(response.headers.get("Cache-Control")).toContain("max-age");
  });

  it("falls back to bundled catalog when remote payload is invalid", async () => {
    process.env.INTELLIGENCE_MODEL_CATALOG_URL = "https://example.com/catalog.json";

    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ broken: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }) as unknown as Response,
      );

    const { GET } = await import("@/app/api/intelligence/models/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.models)).toBe(true);
    expect(payload.models.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });
});
