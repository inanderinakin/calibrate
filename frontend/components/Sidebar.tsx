"use client";

import { useState } from "react";
import {
  UploadCvNavIcon,
  SelectRoleNavIcon,
  AnalyseCvNavIcon,
  ProfileIcon,
  ChevronIcon,
} from "./icons/Icons";

const cvAnalysisItems = [
  { id: "upload-cv", label: "Upload CV", Icon: UploadCvNavIcon },
  { id: "select-role", label: "Select Role", Icon: SelectRoleNavIcon },
  { id: "analyse-cv", label: "Analyse CV", Icon: AnalyseCvNavIcon },
];

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState("upload-cv");

  return (
    <aside className="w-[16.2vw] min-w-[180px] min-h-screen flex flex-col justify-between bg-primary-light dark:bg-sidebar-dark p-[1.5vw] relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="font-black text-[clamp(28px,3.3vw,48px)] text-cream mb-[2.5vw] leading-none">
          Calibrate
        </h2>

        <nav className="flex flex-col gap-[0.8vw]">
          <div className="flex items-center justify-between">
            <span className="font-black text-[clamp(16px,1.7vw,24px)] text-cream">
              CV Analysis
            </span>
            <ChevronIcon className="w-3 h-5 rotate-180" />
          </div>

          <div className="flex flex-col gap-[0.3vw] pl-[0.5vw]">
            {cvAnalysisItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveItem(id)}
                className={`flex items-center gap-2 py-[0.4vw] px-[0.5vw] rounded-lg text-left transition-colors
                  hover:bg-cream/10
                  ${
                    activeItem === id
                      ? "text-[#d8a7a7] dark:text-sky-300"
                      : "text-cream hover:text-[#d8a7a7] dark:hover:text-sky-300"
                  }`}
              >
                <Icon className="size-[1vw] min-w-[14px] min-h-[14px]" />
                <span className="font-black text-[clamp(12px,1.15vw,16.5px)]">
                  {label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-[1vw] cursor-pointer">
            <span className="font-black text-[clamp(16px,1.7vw,24px)] text-cream hover:text-[#d8a7a7] dark:hover:text-sky-300 transition-colors">
              Dashboard
            </span>
            <ChevronIcon className="w-3 h-5" />
          </div>
          <div className="flex items-center justify-between cursor-pointer">
            <span className="font-black text-[clamp(16px,1.7vw,24px)] text-cream hover:text-[#d8a7a7] dark:hover:text-sky-300 transition-colors">
              Road Map
            </span>
            <ChevronIcon className="w-3 h-5" />
          </div>
          <div className="flex items-center justify-between cursor-pointer">
            <span className="font-black text-[clamp(16px,1.7vw,24px)] text-cream hover:text-[#d8a7a7] dark:hover:text-sky-300 transition-colors">
              Settings
            </span>
            <ChevronIcon className="w-3 h-5" />
          </div>
        </nav>
      </div>

      <div className="relative z-10 flex items-center gap-2 border-t border-cream/20 pt-[1vw]">
        <ProfileIcon className="size-[2.2vw] min-w-[32px] min-h-[32px]" />
        <div>
          <p className="font-black text-cream text-[clamp(18px,1.75vw,25px)] leading-tight">
            Cerine
          </p>
          <p className="font-light text-cream text-[clamp(8px,0.7vw,10px)] leading-tight">
            front-end developer
          </p>
        </div>
      </div>
    </aside>
  );
}
