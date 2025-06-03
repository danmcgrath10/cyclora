import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface AvatarProps {
  size?: number;
  url: string | null;
  onUpload: (filePath: string) => void;
  editable?: boolean;
}

export default function Avatar({ 
  url, 
  size = 150, 
  onUpload, 
  editable = true 
}: AvatarProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarSize = { height: size, width: size };

  useEffect(() => {
    if (url) {
      downloadImage(url);
    }
  }, [url]);

  const downloadImage = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);

      if (error) {
        throw error;
      }

      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => {
        setAvatarUrl(fr.result as string);
      };
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error downloading image: ', error.message);
      }
    }
  };

  const uploadAvatar = async () => {
    try {
      setUploading(true);

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload images!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: true,
        quality: 0.8,
        exif: false,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const image = result.assets[0];
      if (!image.uri) {
        throw new Error('No image uri!');
      }

      const arraybuffer = await fetch(image.uri).then((res) => res.arrayBuffer());
      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      onUpload(data.path);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="items-center">
      <TouchableOpacity
        onPress={editable ? uploadAvatar : undefined}
        disabled={uploading || !editable}
        className="relative"
      >
        <View
          style={[avatarSize]}
          className="rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 overflow-hidden"
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[avatarSize]}
              className="rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View 
              style={[avatarSize]} 
              className="rounded-full bg-gray-200 dark:bg-gray-700 justify-center items-center"
            >
              <Text className="text-gray-500 dark:text-gray-400 text-2xl font-semibold">
                {uploading ? '' : '👤'}
              </Text>
            </View>
          )}
        </View>

        {uploading && (
          <View 
            style={[avatarSize]}
            className="absolute inset-0 rounded-full bg-black/50 justify-center items-center"
          >
            <ActivityIndicator color="white" size="large" />
          </View>
        )}

        {editable && !uploading && (
          <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2">
            <Text className="text-white text-xs">📷</Text>
          </View>
        )}
      </TouchableOpacity>

      {editable && (
        <TouchableOpacity
          onPress={uploadAvatar}
          disabled={uploading}
          className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 rounded-lg"
        >
          <Text className="text-white font-medium">
            {uploading ? 'Uploading...' : 'Change Photo'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
} 