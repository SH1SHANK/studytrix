import {
  getQueryCacheLiveness,
  getQueryCachePolicy,
  resolveQueryCacheDomain,
} from "@/features/offline/offline.query-cache.policy";
import { buildNestedRootSignature } from "@/features/offline/offline.query-cache.keys";

describe("offline.query-cache.policy", () => {
  it("resolves query domains correctly", () => {
    expect(resolveQueryCacheDomain("catalog:index")).toBe("catalog:index");
    expect(resolveQueryCacheDomain("catalog:semester:ME:4")).toBe("catalog:semester");
    expect(resolveQueryCacheDomain("drive:folder:abc:root")).toBe("drive:folder");
    expect(resolveQueryCacheDomain("file:metadata:file-1")).toBe("file:metadata");
    expect(resolveQueryCacheDomain("drive:nested-index:ME:4:sig")).toBe("drive:nested-index");
    expect(resolveQueryCacheDomain("unknown:key")).toBeNull();
  });

  it("classifies fresh/stale/expired windows", () => {
    expect(getQueryCacheLiveness(10, 20, 50)).toBe("fresh");
    expect(getQueryCacheLiveness(30, 20, 50)).toBe("stale");
    expect(getQueryCacheLiveness(60, 20, 50)).toBe("expired");
  });

  it("returns expected policy durations", () => {
    const drive = getQueryCachePolicy("drive:folder:folder-1:root");
    const catalog = getQueryCachePolicy("catalog:index");

    expect(drive.expiresInMs).toBe(15 * 60 * 1000);
    expect(catalog.maxStaleInMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("builds deterministic nested root signatures", () => {
    const left = buildNestedRootSignature([
      { courseCode: "ME402", folderId: "z" },
      { courseCode: "ME301", folderId: "a" },
    ]);

    const right = buildNestedRootSignature([
      { courseCode: "ME301", folderId: "a" },
      { courseCode: "ME402", folderId: "z" },
    ]);

    expect(left).toBe(right);
    expect(left).toBe("ME301:a|ME402:z");
  });
});
