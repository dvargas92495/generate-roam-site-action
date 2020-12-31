declare type Config = {
    index: string;
    titleFilter: (title: string) => boolean;
    contentFilter: (content: string) => string;
    template: string;
};
export declare const defaultConfig: {
    index: string;
    titleFilter: (title: string) => boolean;
    contentFilter: (c: string) => string;
    removeTag: boolean;
    template: string;
};
export declare const renderHtmlFromPage: ({ outputPath, pageContent, p, config, pageNames, }: {
    outputPath: string;
    pageContent: string;
    p: string;
    config: Config;
    pageNames: string[];
}) => void;
export declare const run: () => Promise<void>;
export default run;
