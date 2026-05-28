
export default function ProcessHeader() {
  return (
    <header className="w-full bg-gradient-to-r from-card to-primary/10 section-spacing-sm border-b shadow-sm tesla-bg-gradient-blue">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between container-padding">
        <div className="stack-xs">
          <h1 className="text-h1 text-primary">Process Documentation Wiki</h1>
          <p className="text-body text-muted-foreground max-w-2xl">
            Create, organize, and share company processes and SOPs with your team in a modern, beautiful workspace.
          </p>
        </div>
        <div className="flex gap-tight mt-4 md:mt-0">
          {/* Optional: Room for future global actions */}
        </div>
      </div>
    </header>
  );
}
