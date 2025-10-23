import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { getContentLibrary, getCurrentPlayback } from "~/services/content.service";
import { getMediaLibrary, getPlaylists } from "~/services/media.service";
import { Music, Podcast, Album, Play, CheckCircle2, Upload as UploadIcon } from "lucide-react";
import { UploadZone } from "~/components/media/UploadZone";
import { MediaFileCard } from "~/components/media/MediaFileCard";
import { PlaylistManager } from "~/components/media/PlaylistManager";
import { AddToPlaylistDialog } from "~/components/media/AddToPlaylistDialog";
import { useAudioMode } from "~/contexts/AudioModeContext";

export async function loader({ request }: LoaderFunctionArgs) {
  const contentLibrary = await getContentLibrary();
  const currentPlayback = await getCurrentPlayback();
  const mediaLibrary = await getMediaLibrary();
  const playlists = await getPlaylists();

  return json({ contentLibrary, currentPlayback, mediaLibrary, playlists });
}

export let handle = {
  i18n: ["common", "content"],
};

export default function Content() {
  const { contentLibrary, currentPlayback, mediaLibrary, playlists } = useLoaderData<typeof loader>();
  const { t } = useTranslation("content");
  const revalidator = useRevalidator();
  const { audioMode } = useAudioMode();

  const [showUpload, setShowUpload] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [addToPlaylistMediaId, setAddToPlaylistMediaId] = useState<string | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'playlist':
        return <Music className="h-5 w-5" />;
      case 'podcast':
        return <Podcast className="h-5 w-5" />;
      case 'album':
        return <Album className="h-5 w-5" />;
      default:
        return <Music className="h-5 w-5" />;
    }
  };

  const handlePlay = (id: string, title: string, artist: string | undefined, filePath: string) => {
    setCurrentlyPlayingId(id);
  };

  const handleStopAllOthers = () => {
    // This callback is called from MediaFileCard when a song starts playing
    // The card will stop other players via the useEffect hook when isCurrentlyPlaying changes
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        revalidator.revalidate();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleCreatePlaylist = async (name: string) => {
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        revalidator.revalidate();
      }
    } catch (error) {
      console.error('Create playlist failed:', error);
    }
  };

  const handleUpdatePlaylist = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        revalidator.revalidate();
      }
    } catch (error) {
      console.error('Update playlist failed:', error);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        revalidator.revalidate();
      }
    } catch (error) {
      console.error('Delete playlist failed:', error);
    }
  };

  const handleAddToPlaylist = async (playlistId: string, mediaId: string) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      });

      if (response.ok) {
        revalidator.revalidate();
      } else {
        const error = await response.json();
        console.error('Add to playlist failed:', error);
      }
    } catch (error) {
      console.error('Add to playlist failed:', error);
    }
  };

  const handleRename = async (mediaId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      alert('Please enter a valid file name');
      return;
    }

    try {
      const response = await fetch(`/api/media/${mediaId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        revalidator.revalidate();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to rename file');
      }
    } catch (error) {
      console.error('Rename failed:', error);
      alert('Failed to rename file');
    }
  };

  // Filter media by selected playlist
  const filteredMedia = selectedPlaylistId
    ? mediaLibrary.filter(media =>
        media.playlistItems.some(item => item.playlist.id === selectedPlaylistId)
      )
    : mediaLibrary;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("myMusicLibrary")}</h1>
          <p className="text-gray-400 mt-1">{t("manageYourMusic")}</p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-purple-600 hover:bg-purple-700 px-6"
        >
          <UploadIcon className="h-4 w-4 mr-2" />
          {t("uploadMusic")}
        </Button>
      </div>

      {/* Compact Upload Zone */}
      {showUpload && (
        <Card className="border-purple-500/50 bg-purple-900/10 mt-2">
          <CardContent className="p-4">
            <UploadZone
              onUploadComplete={() => {
                revalidator.revalidate();
                setShowUpload(false);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Playlists & Current Playback */}
        <div className="xl:col-span-3 space-y-4">
          {/* Current Playback */}
          {currentPlayback && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Play className="h-4 w-4 text-purple-400" />
                  <span>{t("currentlyPlaying")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-purple-900/30 rounded-lg flex items-center justify-center border border-purple-900">
                    <Music className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{currentPlayback.title}</p>
                    <p className="text-xs text-gray-400 truncate">{currentPlayback.artist}</p>
                    <Badge className="mt-1 text-xs bg-purple-900 text-purple-300">{currentPlayback.type}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Playlist Manager */}
          <PlaylistManager
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={setSelectedPlaylistId}
            onCreatePlaylist={handleCreatePlaylist}
            onUpdatePlaylist={handleUpdatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
          />
        </div>

        {/* Right Column - Media Library */}
        <div className="xl:col-span-9">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{t("uploadedFiles")}</CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    {selectedPlaylistId
                      ? `${filteredMedia.length} ${t("filesInPlaylist")}`
                      : `${mediaLibrary.length} ${t("totalFiles")}`
                    }
                  </CardDescription>
                </div>
                {mediaLibrary.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {mediaLibrary.length} {t("files")}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredMedia.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-20 w-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                    <Music className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{t("noMusicFiles")}</h3>
                  <p className="text-gray-400 mb-6">{t("uploadFilesToStart")}</p>
                  <Button
                    onClick={() => setShowUpload(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    {t("uploadFirstFile")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMedia.map((media) => (
                    <MediaFileCard
                      key={media.id}
                      id={media.id}
                      title={media.title}
                      artist={media.artist ?? undefined}
                      album={media.album ?? undefined}
                      duration={media.duration ?? undefined}
                      fileSize={media.fileSize}
                      filePath={media.filePath}
                      playlists={media.playlistItems.map(item => ({
                        id: item.playlist.id,
                        name: item.playlist.name,
                      }))}
                      onPlay={handlePlay}
                      onDelete={handleDelete}
                      onAddToPlaylist={setAddToPlaylistMediaId}
                      onRename={handleRename}
                      isCurrentlyPlaying={currentlyPlayingId}
                      onStopAllOthers={handleStopAllOthers}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add to Playlist Dialog */}
      {addToPlaylistMediaId && (
        <AddToPlaylistDialog
          mediaId={addToPlaylistMediaId}
          playlists={playlists}
          onClose={() => setAddToPlaylistMediaId(null)}
          onAddToPlaylist={handleAddToPlaylist}
        />
      )}

      {/* Content Library from Service */}
      <Card>
        <CardHeader>
          <CardTitle>{t("content.contentLibrary")}</CardTitle>
          <CardDescription className="text-gray-400">{t("content.availableContent")}</CardDescription>
        </CardHeader>
        <CardContent>
          {contentLibrary.length === 0 ? (
            <div className="text-center py-12 text-gray-700 dark:text-gray-400">
              <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t("content.noContentAvailable")}</p>
              <p className="text-sm text-gray-700 dark:text-gray-400">{t("content.contentWillAppear")}</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {contentLibrary.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 sm:p-4 border-2 border-gray-700 rounded-xl hover:border-purple-500 transition-all bg-gray-700/30"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 text-purple-400">
                      {getContentIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">{item.creator}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className="text-xs capitalize bg-purple-900/50 text-purple-300 border-purple-900">
                          {item.type}
                        </Badge>
                        {item.explicit && (
                          <Badge className="text-xs bg-yellow-900/50 text-yellow-300 border-yellow-900">
                            {t("content.explicit")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {item.enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : null}
                    <Switch defaultChecked={item.enabled} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("content.contentFilters")}</CardTitle>
          <CardDescription className="text-gray-400">{t("content.controlWhatContent")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{t("content.explicitContent")}</p>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                {t("content.preventAccess")}
              </p>
            </div>
            <Switch defaultChecked className="flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{t("content.ageAppropriateFilter")}</p>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                {t("content.onlyShowContent")}
              </p>
            </div>
            <Switch defaultChecked className="flex-shrink-0" />
          </div>

          <Button size="lg" className="w-full">{t("content.saveFilterSettings")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
