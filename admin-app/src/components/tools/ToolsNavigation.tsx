
import { Link } from "react-router-dom";
import { Share2, ListChecks } from "lucide-react";

const ToolQuickLinks = [
  {
    name: "Delegate & Elevate",
    href: "/tools/delegate-elevate",
    Icon: ListChecks,
    desc: "Focus on what you love and delegate the rest.",
    color: "bg-primary/5 text-primary hover:bg-primary/10"
  },
  {
    name: "Clarity Break Journal",
    href: "/tools/clarity-break",
    Icon: Share2,
    desc: "Reflect, solve, and gain insight with guided clarity breaks.",
    color: "bg-success/5 text-success hover:bg-success/10"
  }
]

export default function ToolsNavigation() {
  return (
    <nav className="flex flex-col md:flex-row justify-center gap-6">
      {ToolQuickLinks.map(({ name, href, Icon, desc, color }) => (
        <Link
          to={href}
          key={name}
          className={`flex-1 shadow rounded-lg p-6 flex items-start gap-4 transition ${color} border border-border`}
        >
          <div>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-sm mt-1 text-muted-foreground">{desc}</p>
          </div>
        </Link>
      ))}
    </nav>
  )
}
