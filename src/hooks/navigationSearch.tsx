import { useLayoutEffect, useState } from "react";
import { Platform } from "react-native";
import { SearchBarProps } from "react-native-screens";
import { useNavigation } from "expo-router";
import { colors } from "@/constants/token";

const defaultSearchBar: SearchBarProps = {
  tintColor: colors.primary,
  hideWhenScrolling: false,
};

export const navigationSearch = ({ searchBarOptions }: { searchBarOptions?: SearchBarProps }) => {
  const navigation = useNavigation();
  const [search, setSearch] = useState("");

  const handleOnChangeText: SearchBarProps["onChangeText"] = ({ nativeEvent: { text } }) => {
    setSearch(text);
  };

  useLayoutEffect(() => {
    if (Platform.OS === "ios" && navigation && typeof navigation.setOptions === "function") {
      navigation.setOptions({
        headerSearchBarOptions: {
          ...defaultSearchBar,
          ...searchBarOptions,
          onChangeText: handleOnChangeText,
        },
      });
    }
  }, [navigation, searchBarOptions]);

  return { search, setSearch };
};
