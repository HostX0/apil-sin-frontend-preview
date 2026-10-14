import type {
  WhatsAppAutomationEvent,
  WhatsAppAutomationTemplate,
  WhatsAppWelcomeImageId,
  WhatsAppWelcomeUpload,
} from '@muhami/shared';

export type WelcomeImageChoice = WhatsAppWelcomeImageId | 'custom';

type WelcomeImageSettings = Pick<
  WhatsAppAutomationTemplate,
  'welcomeImageEnabled' | 'welcomeImageId' | 'welcomeUpload'
>;

/** A legacy template without an image must not silently select a default image. */
export function isWelcomeImageEnabled(settings: WelcomeImageSettings): boolean {
  return (
    settings.welcomeImageEnabled !== false &&
    Boolean(settings.welcomeImageId || settings.welcomeUpload)
  );
}

export function shouldUploadWelcomeImage(
  eventKey: WhatsAppAutomationEvent,
  attachImage: boolean,
  choice: WelcomeImageChoice,
  hasFile: boolean,
): boolean {
  return eventKey === 'client.created' && attachImage && choice === 'custom' && hasFile;
}

/** Pausing attachments preserves the last saved image, never an unuploaded draft. */
export function welcomeImageSelection(
  eventKey: WhatsAppAutomationEvent,
  attachImage: boolean,
  choice: WelcomeImageChoice,
  upload: WhatsAppWelcomeUpload | null,
  saved: WelcomeImageSettings,
): WelcomeImageSettings {
  if (eventKey !== 'client.created') {
    return { welcomeImageEnabled: false, welcomeImageId: null, welcomeUpload: null };
  }
  if (!attachImage) {
    return {
      welcomeImageEnabled: false,
      welcomeImageId: saved.welcomeImageId,
      welcomeUpload: saved.welcomeUpload,
    };
  }
  if (choice !== 'custom') {
    return { welcomeImageEnabled: true, welcomeImageId: choice, welcomeUpload: null };
  }
  return {
    welcomeImageEnabled: true,
    welcomeImageId: null,
    welcomeUpload: upload
      ? {
          objectKey: upload.objectKey,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
        }
      : null,
  };
}
