type AppIconArtworkProps = {
  size: number;
};

export function AppIconArtwork({ size }: AppIconArtworkProps) {
  const crownWidth = Math.round(size * 0.54);
  const crownHeight = Math.round(size * 0.42);
  const rootWidth = Math.round(size * 0.16);
  const rootHeight = Math.round(size * 0.34);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f766e",
      }}
    >
      <div
        style={{
          position: "relative",
          width: Math.round(size * 0.64),
          height: Math.round(size * 0.68),
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.04),
            width: crownWidth,
            height: crownHeight,
            borderRadius: Math.round(size * 0.2),
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: Math.round(size * 0.17),
            top: Math.round(size * 0.34),
            width: rootWidth,
            height: rootHeight,
            borderRadius: `0 0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.08)}px`,
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: Math.round(size * 0.17),
            top: Math.round(size * 0.34),
            width: rootWidth,
            height: rootHeight,
            borderRadius: `0 0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.08)}px`,
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
}
