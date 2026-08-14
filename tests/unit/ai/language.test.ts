import { describe, it, expect } from 'vitest';
import {
    nativeNamesIn,
    primaryNativeName,
    preserveNativeHeading,
    preserveNativeFields,
    askedToKeepNativeScript,
} from '@/lib/ai/composition/language';

const SWEET =
    'मिठास स्वीट्स — our sweet shop in old delhi, we make kaju katli motichoor laddu and gulab jamun fresh daily, want the name in hindi at the top, photos and our phone number';
const SAREE =
    'கோமளா சில்க்ஸ் is our silk saree shop in kanchipuram, three generations, pure silk and wedding sarees, keep the tamil name on the page and show the collection';

describe('native-script names', () => {
    it('picks the Hindi shop name, not the English around it', () => {
        expect(primaryNativeName(SWEET)).toBe('मिठास स्वीट्स');
        expect(nativeNamesIn(SWEET)).toEqual(['मिठास स्वीट्स']);
        expect(askedToKeepNativeScript(SWEET)).toBe(true);
    });

    it('picks the Tamil shop name', () => {
        expect(primaryNativeName(SAREE)).toBe('கோமளா சில்க்ஸ்');
        expect(askedToKeepNativeScript(SAREE)).toBe(true);
    });

    it('leaves a Latin-only prompt alone', () => {
        expect(primaryNativeName('landing page for a tool that helps small shops track stock')).toBeNull();
    });

    it('replaces a transliterated hero heading (D15 v29)', () => {
        expect(preserveNativeHeading('Mithaas Sweet Shop', SWEET)).toBe('मिठास स्वीट्स');
    });

    it('keeps the heading when fill already used the native spelling', () => {
        expect(preserveNativeHeading('मिठास स्वीट्स', SWEET)).toBe('मिठास स्वीट्स');
    });

    it('does not overwrite a mixed-script heading', () => {
        expect(preserveNativeHeading('Welcome to मिठास स्वीट्स', SWEET))
            .toBe('Welcome to मिठास स्वीट्स');
    });

    it('pins heading and tagline on filled props', () => {
        const props: Record<string, unknown> = {
            heading: 'Mithaas Sweet Shop',
            tagline: 'Mithaas — sweets in Old Delhi',
            sub: 'Fresh kaju katli daily',
        };
        preserveNativeFields(props, SWEET, { heading: 80, tagline: 120 });
        expect(props.heading).toBe('मिठास स्वीट्स');
        expect(props.tagline).toBe('मिठास स्वीट्स');
        expect(props.sub).toBe('Fresh kaju katli daily');
    });

    it('refuses a native name that would overflow the field', () => {
        expect(preserveNativeHeading('Mithaas Sweet Shop', SWEET, 3)).toBe('Mithaas Sweet Shop');
    });
});
