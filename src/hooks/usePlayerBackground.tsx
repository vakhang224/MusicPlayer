import { colors } from "@/constants/token";
import { useEffect, useState } from "react";
import ImageColors from "react-native-image-colors";
import type { AndroidImageColors } from "react-native-image-colors/lib/typescript/types";

export const usePlayerBackground = (imageUrl: string) => {
  const [imageColors, setImageColors] = useState<AndroidImageColors | null>(null);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const result = await ImageColors.getColors(imageUrl, {
          fallback: colors.background,
          cache: true,
          key: imageUrl
        });
        setImageColors(result as AndroidImageColors);
      } catch (err) {
        console.warn("Error loading colors:", err);
      }
    }
    fetchColors();
  }, [imageUrl]);

  return { imageColors };
};
