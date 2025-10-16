import { useFetcher } from "@remix-run/react";
import { Select } from "~/components/ui/select";
import { supportedLanguages, type SupportedLanguage } from "~/i18n";

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
}

export function LanguageSelector({ currentLanguage }: LanguageSelectorProps) {
  const fetcher = useFetcher();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    
    // Use Remix fetcher to submit the form
    fetcher.submit(
      { language: newLanguage },
      { method: "POST", action: "/api/change-language" }
    );
  };

  return (
    <div className="relative">
      <Select
        value={currentLanguage}
        onChange={handleLanguageChange}
        className="w-[160px] h-9 text-sm font-medium leading-tight"
      >
        {Object.entries(supportedLanguages).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </Select>
    </div>
  );
}

