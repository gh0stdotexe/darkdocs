const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const CONTROL_D_DOCS_URL = 'https://docs.controld.com/docs';
const LOCAL_DOCS_PATH = path.join(process.cwd(), 'control-d');

// Expected structure based on Control D's documentation
const EXPECTED_STRUCTURE = {
    'getting-started': {
        'introduction.mdx': true,
        'use-cases': {
            'personal-use-cases.mdx': true,
            'business-use-cases.mdx': true
        },
        'deployment.mdx': true,
        'limitations.mdx': true,
        'free-dns-resolvers.mdx': true,
        'control-d-ip-ranges.mdx': true
    },
    'business': {
        'control-d-for-business.mdx': true,
        'solutions': {
            'secure-end-user-devices.mdx': true,
            'protect-whole-networks.mdx': true,
            'block-unwanted-content.mdx': true,
            'gain-actionable-insights.mdx': true,
            'regain-privacy.mdx': true,
            'cipa-compliance.mdx': true,
            'hipaa-compliance.mdx': true,
            'keeping-children-safe-in-education.mdx': true
        },
        'industries': {
            'smbs.mdx': true,
            'managed-service-providers.mdx': true,
            'startups.mdx': true,
            'schools.mdx': true,
            'non-profits.mdx': true,
            'public-wifi-operators.mdx': true,
            'airbnb-hosts.mdx': true
        },
        'features': {
            'malware-blocking.mdx': true,
            'web-filtering.mdx': true,
            'service-filtering.mdx': true,
            'custom-filtering.mdx': true,
            'modern-protocols.mdx': true,
            'analytics.mdx': true,
            'data-streaming.mdx': true,
            'traffic-redirection.mdx': true,
            'multi-tenancy.mdx': true,
            'admin-logs.mdx': true
        }
    },
    'troubleshooting': {
        'ip-not-authorized.mdx': true,
        'high-latency.mdx': true,
        'unable-to-resolve.mdx': true,
        'check-dns.mdx': true,
        'collect-activity-log.mdx': true,
        'captive-portals.mdx': true,
        'ip-mismatch.mdx': true,
        'lost-password.mdx': true,
        'browser-dns.mdx': true,
        'icloud-private-relay.mdx': true,
        'geo-blocking.mdx': true
    },
    'guides': {
        'block-internet-on-a-schedule.mdx': true,
        'update-ip-via-heartbeat.mdx': true,
        'advanced-rules.mdx': true,
        'legacy-routers': {
            'asus-router.mdx': true,
            'netgear-router.mdx': true,
            'linksys-router.mdx': true,
            'd-link-router.mdx': true,
            'tp-link-router.mdx': true,
            'dd-wrt-router.mdx': true,
            'freshtomato-router.mdx': true,
            'fritzbox-router.mdx': true
        },
        'root-certificate.mdx': true,
        'active-directory': {
            'integration-guide.mdx': true,
            'microsoft-ncsi.mdx': true
        },
        'log-streaming': {
            'csv-export.mdx': true,
            'siem-log-streaming': {
                'general-purpose.mdx': true,
                'splunk.mdx': true,
                'log-field-reference.mdx': true
            }
        },
        'tailscale-integration.mdx': true,
        'glinet-setup.mdx': true,
        'dns-stamp.mdx': true,
        'sso-oidc-okta.mdx': true
    }
};

function validateDirectoryStructure(localPath, expectedStructure, currentPath = '') {
    let hasErrors = false;
    
    // Check if directory exists
    if (!fs.existsSync(localPath)) {
        console.error(`Missing directory: ${currentPath || 'root'}`);
        return true;
    }
    
    const localFiles = fs.readdirSync(localPath);
    
    // Check for unexpected files/directories
    for (const file of localFiles) {
        const fullPath = path.join(localPath, file);
        const relativePath = path.join(currentPath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!expectedStructure[file]) {
                console.error(`Unexpected directory: ${relativePath}`);
                hasErrors = true;
            } else if (typeof expectedStructure[file] === 'object') {
                hasErrors = validateDirectoryStructure(fullPath, expectedStructure[file], relativePath) || hasErrors;
            }
        } else if (file.endsWith('.mdx')) {
            if (!expectedStructure[file]) {
                console.error(`Unexpected file: ${relativePath}`);
                hasErrors = true;
            }
        }
    }
    
    // Check for missing files/directories
    for (const [key, value] of Object.entries(expectedStructure)) {
        if (value === true && !localFiles.includes(key)) {
            console.error(`Missing file: ${path.join(currentPath, key)}`);
            hasErrors = true;
        } else if (typeof value === 'object' && !localFiles.includes(key)) {
            console.error(`Missing directory: ${path.join(currentPath, key)}`);
            hasErrors = true;
        }
    }
    
    return hasErrors;
}

async function validateDocs() {
    let hasErrors = false;
    
    // Validate directory structure
    console.log('Validating directory structure...');
    const structureErrors = validateDirectoryStructure(LOCAL_DOCS_PATH, EXPECTED_STRUCTURE);
    if (structureErrors) {
        console.error('Directory structure validation failed!');
        hasErrors = true;
    }
    
    // Check for outdated documents
    console.log('\nChecking for outdated documents...');
    const outdatedDocs = [];
    function checkOutdated(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                checkOutdated(filePath);
            } else if (file.endsWith('.mdx')) {
                const daysOld = (Date.now() - stat.mtime) / (1000 * 60 * 60 * 24);
                if (daysOld > 1) {
                    const relativePath = path.relative(LOCAL_DOCS_PATH, filePath);
                    outdatedDocs.push(relativePath);
                }
            }
        }
    }
    checkOutdated(LOCAL_DOCS_PATH);
    
    if (outdatedDocs.length > 0) {
        console.error('Potentially outdated documents (older than 1 day):');
        outdatedDocs.forEach(doc => console.error(`- ${doc}`));
        hasErrors = true;
    }
    
    if (hasErrors) {
        console.error('\nDocumentation validation failed!');
        process.exit(1);
    }
    
    console.log('\nDocumentation validation successful!');
}

validateDocs(); 
validateDocs(); 