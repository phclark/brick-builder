import Scene3D from "@/components/Scene3D";

export default function Home() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50">
      <Scene3D className="w-full h-full" />
      
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-heading">
              BrickBuilder <span className="text-orange-500">3D</span>
            </h1>
            <p className="text-sm text-slate-600 font-body mt-1">
              Creative Building Workspace
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
