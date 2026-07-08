export function FileIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/d34fce8f-d797-4e57-b4e2-295278d4da69"
      alt="Upload file"
      className={`${className || "size-[150px]"} dark:invert dark:brightness-125`}
    />
  );
}

export function SmallFileIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/d1fd7da8-4db2-4876-89ff-538c1efe1402"
      alt="File"
      className={`${className || "size-[76px]"} dark:invert dark:brightness-125`}
    />
  );
}

export function CheckIcon({ className }: { className?: string }) {
  // Coche verte : reste identique dans les 2 thèmes, pas d'inversion
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/5f84bc12-023e-41af-bf8e-aa5bf9f5c91d"
      alt="Uploaded"
      className={className || "size-[40px]"}
    />
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  // Déjà en creamy/blanc dans le design original, pas d'inversion
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/5124461a-b402-4e42-9635-88bdf44771dc"
      alt=""
      className={className || "size-[53px]"}
    />
  );
}

export function SecureIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/f6e3590d-2ef2-4464-a259-85abb9142d06"
      alt="Secure"
      className={`${className || "size-6"} dark:invert dark:brightness-125`}
    />
  );
}

export function AmazonIcon({ className }: { className?: string }) {
  // Logo de marque : ne jamais inverser
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/6c0ed23e-aee8-4617-aee2-d3f71dc38b6f"
      alt="Amazon"
      className={className || "size-12"}
    />
  );
}

export function UploadCvNavIcon({ className }: { className?: string }) {
  // Déjà creamy dans le design, visible sur les 2 fonds de sidebar
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/68602431-8f09-4910-92b2-83e9b5c9c701"
      alt=""
      className={className || "size-5"}
    />
  );
}

export function SelectRoleNavIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/628e555d-4e2d-47d1-8165-d55857564740"
      alt=""
      className={className || "size-5"}
    />
  );
}

export function AnalyseCvNavIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/af15ec0b-8433-47b7-829d-0c770a24bfa2"
      alt=""
      className={className || "size-5"}
    />
  );
}

export function ProfileIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/c7d07e2a-83ab-4d8b-ae28-932404f129e0"
      alt="Profile"
      className={className || "size-10"}
    />
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://www.figma.com/api/mcp/asset/dc1fa976-c815-48d4-8458-1b08a42f4d4c"
      alt=""
      className={className || "w-3 h-5"}
    />
  );
}