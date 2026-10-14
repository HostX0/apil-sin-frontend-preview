import { describe, expect, it } from 'vitest';
import { WHATSAPP_DEFAULT_WELCOME_IMAGE_ID, type WhatsAppWelcomeUpload } from '@muhami/shared';
import {
  isWelcomeImageEnabled,
  shouldUploadWelcomeImage,
  welcomeImageSelection,
} from './welcome-image-selection';

const custom: WhatsAppWelcomeUpload = {
  objectKey: 'offices/office/whatsapp/welcome-images/image.png',
  fileName: 'welcome.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
};

const savedCustom = {
  welcomeImageEnabled: true,
  welcomeImageId: null,
  welcomeUpload: custom,
};
const savedBuiltIn = {
  welcomeImageEnabled: true,
  welcomeImageId: WHATSAPP_DEFAULT_WELCOME_IMAGE_ID,
  welcomeUpload: null,
};
const noSavedImage = {
  welcomeImageEnabled: false,
  welcomeImageId: null,
  welcomeUpload: null,
};

describe('welcome image persistence and opt-out', () => {
  it('pauses a saved custom image without deleting it, then reuses it after reload', () => {
    const paused = welcomeImageSelection('client.created', false, 'custom', custom, savedCustom);
    expect(paused).toEqual({ ...savedCustom, welcomeImageEnabled: false });
    expect(isWelcomeImageEnabled(paused)).toBe(false);
    const reenabled = welcomeImageSelection(
      'client.created',
      true,
      'custom',
      paused.welcomeUpload,
      paused,
    );
    expect(reenabled).toEqual(savedCustom);
    expect(isWelcomeImageEnabled(reenabled)).toBe(true);
  });

  it('retains the saved bundled design while attachment sending is paused', () => {
    const paused = welcomeImageSelection(
      'client.created',
      false,
      WHATSAPP_DEFAULT_WELCOME_IMAGE_ID,
      null,
      savedBuiltIn,
    );
    expect(paused).toEqual({ ...savedBuiltIn, welcomeImageEnabled: false });
    expect(isWelcomeImageEnabled(paused)).toBe(false);
  });

  it('does not replace a saved image with an unuploaded draft during an OFF save', () => {
    expect(welcomeImageSelection('client.created', false, 'custom', null, savedCustom)).toEqual({
      ...savedCustom,
      welcomeImageEnabled: false,
    });
    expect(welcomeImageSelection('client.created', false, 'custom', null, savedBuiltIn)).toEqual({
      ...savedBuiltIn,
      welcomeImageEnabled: false,
    });
    expect(shouldUploadWelcomeImage('client.created', false, 'custom', true)).toBe(false);
  });

  it('keeps a legacy template with no saved image empty on unrelated text saves', () => {
    const legacy = { ...noSavedImage, welcomeImageEnabled: true };
    expect(isWelcomeImageEnabled(legacy)).toBe(false);
    expect(
      welcomeImageSelection(
        'client.created',
        isWelcomeImageEnabled(legacy),
        WHATSAPP_DEFAULT_WELCOME_IMAGE_ID,
        null,
        legacy,
      ),
    ).toEqual(noSavedImage);
  });

  it('restores the chosen custom image when the parent is turned back on', () => {
    expect(welcomeImageSelection('client.created', true, 'custom', custom, savedCustom)).toEqual({
      welcomeImageEnabled: true,
      welcomeImageId: null,
      welcomeUpload: custom,
    });
  });

  it('never submits a retained custom image when a bundled design is chosen', () => {
    expect(
      welcomeImageSelection(
        'client.created',
        true,
        WHATSAPP_DEFAULT_WELCOME_IMAGE_ID,
        custom,
        savedCustom,
      ),
    ).toEqual({
      welcomeImageEnabled: true,
      welcomeImageId: WHATSAPP_DEFAULT_WELCOME_IMAGE_ID,
      welcomeUpload: null,
    });
  });

  it('cannot carry a welcome image into another event', () => {
    expect(welcomeImageSelection('lawyer.created', true, 'custom', custom, savedCustom)).toEqual({
      welcomeImageEnabled: false,
      welcomeImageId: null,
      welcomeUpload: null,
    });
    expect(shouldUploadWelcomeImage('lawyer.created', true, 'custom', true)).toBe(false);
  });

  it('only uploads a new custom file when its sending option is enabled', () => {
    expect(shouldUploadWelcomeImage('client.created', true, 'custom', true)).toBe(true);
    expect(shouldUploadWelcomeImage('client.created', true, 'custom', false)).toBe(false);
    expect(
      shouldUploadWelcomeImage('client.created', true, WHATSAPP_DEFAULT_WELCOME_IMAGE_ID, true),
    ).toBe(false);
  });
});
