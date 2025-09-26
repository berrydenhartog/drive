import {
  getMimeCategory,
  MimeCategory,
  removeFileExtension,
} from "@/features/explorer/utils/mimeTypes";
import { Icon, IconType } from "@gouvfr-lasuite/ui-kit";
import { Button, Modal, ModalSize } from "@openfun/cunningham-react";
import React, { useEffect, useMemo, useState } from "react";
import { ImageViewer } from "../image-viewer/ImageViewer";
import { VideoPlayer } from "../video-player/VideoPlayer";
import { AudioPlayer } from "../audio-player/AudioPlayer";
import { PreviewPdf } from "../pdf-preview/PreviewPdf";

import { NotSupportedPreview } from "../not-supported/NotSupportedPreview";
import { getIconByMimeType } from "@/features/explorer/components/icons/ItemIcon";
import { useTranslation } from "react-i18next";
import { SuspiciousPreview } from "../suspicious/SuspiciousPreview";
import { WopiEditor } from "../wopi/WopiEditor";

export type FilePreviewType = {
  id: string;
  title: string;
  mimetype: string;
  is_wopi_supported?: boolean;
  url: string;
};

type FilePreviewData = FilePreviewType & {
  category: MimeCategory;
  isSuspicious?: boolean;
};

interface FilePreviewProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  files?: FilePreviewType[];
  initialIndexFile?: number;
  openedFileId?: string;
  headerRightContent?: React.ReactNode;
  sidebarContent?: React.ReactNode;
  onChangeFile?: (file?: FilePreviewType) => void;
  handleDownloadFile?: (file?: FilePreviewType) => void;
  hideCloseButton?: boolean;
  hideNav?: boolean;
}

export const FilePreview = ({
  isOpen,
  onClose,
  title = "File Preview",
  files = [],
  initialIndexFile = -1,
  openedFileId,
  sidebarContent,
  headerRightContent,
  onChangeFile,
  handleDownloadFile,
  hideCloseButton,
  hideNav,
}: FilePreviewProps) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndexFile);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const data: FilePreviewData[] = useMemo(() => {
    return files?.map((file) => ({
      ...file,
      is_wopi_supported: file.is_wopi_supported ?? false,
      category: getMimeCategory(file.mimetype),
    }));
  }, [files]);

  const currentFile: FilePreviewData | undefined =
    currentIndex > -1 ? data[currentIndex] : undefined;

  const handleDownload = async () => {
    handleDownloadFile?.(currentFile);
  };

  // Render the appropriate viewer based on file category
  const renderViewer = () => {
    if (!currentFile) {
      return <div>{t("file_preview.unsupported.title")}</div>;
    }

    if (currentFile.isSuspicious) {
      return <SuspiciousPreview handleDownload={handleDownload} />;
    }
    if (currentFile.is_wopi_supported) {
      return <WopiEditor item={currentFile} />;
    }

    switch (currentFile.category) {
      case MimeCategory.IMAGE:
        return (
          <ImageViewer
            src={currentFile.url}
            alt={currentFile.title}
            className="file-preview-viewer"
          />
        );
      case MimeCategory.VIDEO:
        return (
          <div className="video-preview-viewer-container">
            <div className="video-preview-viewer">
              <VideoPlayer
                src={currentFile.url}
                className="file-preview-viewer"
                controls={true}
              />
            </div>
          </div>
        );
      case MimeCategory.AUDIO:
        return (
          <div className="video-preview-viewer-container">
            <div className="video-preview-viewer">
              <AudioPlayer
                src={currentFile.url}
                title={currentFile.title}
                className="file-preview-viewer"
              />
            </div>
          </div>
        );
      case MimeCategory.PDF:
        return <PreviewPdf src={currentFile.url} />;

      default:
        return (
          <NotSupportedPreview file={currentFile} onDownload={handleDownload} />
        );
    }
  };

  useEffect(() => {
    if (openedFileId) {
      const index = data.findIndex((file) => file.id === openedFileId);
      const newIndex = index > -1 ? index : -1;
      setCurrentIndex(newIndex);
    } else {
      setCurrentIndex(-1);
    }
  }, [openedFileId]);

  useEffect(() => {
    onChangeFile?.(currentFile);
  }, [currentFile]);

  if (!isOpen || !currentFile) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={() => onClose?.()} size={ModalSize.FULL}>
      <div data-testid="file-preview">
        <div
          className={`file-preview-container ${
            isSidebarOpen ? "sidebar-open" : ""
          }`}
        >
          <div className="file-preview-header">
            <div className="file-preview-header__content">
              <div className="file-preview-header__content-left">
                {!hideCloseButton && (
                  <Button
                    color="tertiary-text"
                    size="small"
                    onClick={onClose}
                    icon={<Icon name="close" />}
                  />
                )}

                <div className="file-preview-title">
                  <img
                    src={getIconByMimeType(currentFile.mimetype, "mini").src}
                    alt=""
                    width={24}
                    className={`item-icon`}
                    draggable="false"
                  />
                  <h1 className="file-preview-title">
                    {removeFileExtension(currentFile?.title || title)}
                  </h1>
                </div>
              </div>
              <div className="file-preview-header__content-center">
                {!hideNav && (
                  <FilePreviewNav
                    currentIndex={currentIndex}
                    totalFiles={data.length}
                    onPrevious={() => setCurrentIndex(currentIndex - 1)}
                    onNext={() => setCurrentIndex(currentIndex + 1)}
                  />
                )}
              </div>
              <div className="file-preview-header__content-right">
                {headerRightContent}
                {handleDownloadFile && (
                  <Button
                    color="tertiary-text"
                    onClick={handleDownload}
                    icon={
                      <Icon type={IconType.OUTLINED} name={"file_download"} />
                    }
                  />
                )}

                <Button
                  color="tertiary-text"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  icon={<Icon name={"info_outline"} />}
                />
              </div>
            </div>
          </div>
          <div className="file-preview-content">
            <div className="file-preview-main">{renderViewer()}</div>

            <div
              className={`file-preview-sidebar ${isSidebarOpen ? "open" : ""}`}
            >
              {sidebarContent}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

interface FilePreviewNavProps {
  currentIndex: number;
  totalFiles: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const FilePreviewNav: React.FC<FilePreviewNavProps> = ({
  currentIndex,
  totalFiles,
  onPrevious,
  onNext,
}) => {
  return (
    <div className="file-preview-nav" data-testid="file-preview-nav">
      <Button
        color="tertiary-text"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        icon={<Icon name="arrow_back" />}
      />
      <span className="file-preview-nav__count">
        {currentIndex + 1} / {totalFiles}
      </span>
      <Button
        color="tertiary-text"
        onClick={onNext}
        disabled={currentIndex === totalFiles - 1}
        icon={<Icon name="arrow_forward" />}
      />
    </div>
  );
};
