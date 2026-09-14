import React from "react";
import ispmLogo from "../../../assets/ispm-logo.jpg";

interface IspmLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function IspmLogo({
  className = "",
  showText = true,
  size = "md",
}: IspmLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className={`ispm-badge inline-flex flex-col items-center gap-1.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-sm bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs`}
      >
        <img
          src={ispmLogo}
          alt="Logo ISPM - Institut Supérieur Polytechnique de Madagascar"
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="text-center leading-tight">
          <p className="text-[10.5px] text-[#5C6661] m-0">
            Institut Supérieur Polytechnique de Madagascar
          </p>
        </div>
      )}
    </div>
  );
}
