import { NextResponse } from "next/server";
import { execSync } from "child_process";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string;
}

/** GET /api/system/docker — daftar container Docker (via docker CLI/socket). */
export async function GET() {
  try {
    const out = execSync("docker ps -a --no-trunc --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.State}}|{{.Status}}|{{.Ports}}'", {
      encoding: "utf8",
      timeout: 8000,
    });
    const containers: DockerContainer[] = out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [id, name, image, state, status, ...ports] = line.split("|");
        return { id: id?.slice(0, 12) ?? "", name: name ?? "", image: image ?? "", state: state ?? "", status: status ?? "", ports: ports.join("|") || "—" };
      });
    return NextResponse.json({ available: true, containers });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 120) : "error";
    return NextResponse.json({ available: false, error: msg });
  }
}
