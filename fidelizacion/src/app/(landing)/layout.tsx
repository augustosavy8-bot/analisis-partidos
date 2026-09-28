import { MotionProvider } from "@/components/landing/MotionProvider";
import "./landing.css";

// Las tipografías (Manrope e Inter) se cargan en el layout raíz: las comparte la app.
export default function LayoutLanding({ children }: LayoutProps<"/">) {
  return (
    <div className="landing flex flex-1 flex-col">
      <MotionProvider>{children}</MotionProvider>
    </div>
  );
}
