import Image from "next/image";

// Platform image mapping
export const platformImages = {
  all: "/globe.svg",
  instagram: "/instagram-svgrepo-com.svg",
  youtube: "/youtube-svgrepo-com.svg",
  tiktok: "/tiktok-logo-logo-svgrepo-com.svg",
};

// Get platform image path
export function getPlatformImage(platform) {
  return platformImages[platform] || platformImages.all;
}

// Platform image component
export function PlatformImage({ 
  platform, 
  className = "h-4 w-4", 
  width = 16, 
  height = 16,
  alt 
}) {
  const imageSrc = getPlatformImage(platform);
  const altText = alt || `${platform} logo`;
  
  return (
    <Image
      src={imageSrc}
      alt={altText}
      width={width}
      height={height}
      className={className}
    />
  );
}

// Platform image button component
export function PlatformImageButton({ 
  platform, 
  isActive = false, 
  onClick, 
  className = "",
  buttonClassName = "",
  imageClassName = "h-4 w-4",
  title
}) {
  const imageSrc = getPlatformImage(platform);
  const altText = `${platform} logo`;
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-lg transition-all duration-200 ${buttonClassName}`}
      title={title || `${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
    >
      <Image
        src={imageSrc}
        alt={altText}
        width={16}
        height={16}
        className={imageClassName}
      />
    </button>
  );
}

export default platformImages;
