export default {
    ignoreFiles: [
        // Directories
        'node_modules',
        'test',
        
        // TypeScript files
        '*.ts',
        
        // Configuration files
        '.prettierrc',
        'tsconfig.json',
        'web-ext-config.mjs',
        'deno.json',
        
        // Lock files
        'deno.lock',
        'package-lock.json',
        
        // Metadata files
        'package.json',
        '.gitignore',
        
        // Documentation and assets
        'README.md',
        'screenshot.png'
    ]
};