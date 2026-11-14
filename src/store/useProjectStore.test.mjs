import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

test("records successful deletions without losing the current position or failed marks", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
  try {
    const { useProjectStore } = await server.ssrLoadModule("/src/store/useProjectStore.ts");
    const project = {
      id: "p1",
      name: "Photos",
      targetFolder: "/photos",
      currentIndex: 2,
      totalFiles: 4,
      markedForDeletion: ["/photos/a.jpg", "/photos/b.jpg"],
      lastAccessed: 1,
    };
    useProjectStore.setState({ projects: [project], activeProjectId: "p1" });

    useProjectStore.getState().recordDeletedFile("p1", "/photos/a.jpg", 0, 3);
    assert.deepEqual(useProjectStore.getState().projects[0], {
      ...project,
      currentIndex: 1,
      totalFiles: 3,
      markedForDeletion: ["/photos/b.jpg"],
    });

    useProjectStore.getState().recordDeletedFile("p1", "/photos/not-in-scan.jpg", -1, 3);
    assert.equal(useProjectStore.getState().projects[0].currentIndex, 1);
    assert.equal(useProjectStore.getState().projects[0].totalFiles, 3);
    assert.deepEqual(useProjectStore.getState().projects[0].markedForDeletion, ["/photos/b.jpg"]);

    useProjectStore.getState().updateProjectScan("p1", 4, 2);
    assert.equal(useProjectStore.getState().projects[0].currentIndex, 2);
    assert.equal(useProjectStore.getState().projects[0].totalFiles, 4);
  } finally {
    await server.close();
  }
});
