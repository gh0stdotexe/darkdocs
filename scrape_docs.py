#!/usr/bin/env python3
import os
import re
import html2text
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin, urlparse
import json
import time

class ControlDDocsScraper:
    def __init__(self, base_url="https://docs.controld.com/docs/", output_dir="control-d"):
        self.base_url = base_url.rstrip('/')
        self.output_dir = output_dir
        self.h2t = html2text.HTML2Text()
        self.h2t.ignore_links = False
        self.h2t.ignore_images = False
        self.h2t.body_width = 0
        self.visited_urls = set()
        
        # Define the main sections from Control D's structure
        self.sections = {
            'getting-started': ['introduction', 'use-cases', 'deployment', 'limitations', 'free-dns-resolvers', 'ip-ranges'],
            'business': {
                'solutions': ['secure-end-user-devices', 'protect-whole-networks', 'block-unwanted-content', 'gain-actionable-insights', 'regain-privacy', 'cipa-compliance', 'hipaa-compliance', 'kcsie-compliance'],
                'industries': ['smbs', 'msps', 'startups', 'schools', 'non-profits', 'public-wifi', 'airbnb'],
                'features': ['malware-blocking', 'web-filtering', 'service-filtering', 'custom-filtering', 'modern-protocols', 'analytics', 'data-streaming', 'traffic-redirection', 'multi-tenancy', 'admin-logs']
            },
            'web-dashboard': ['profiles', 'endpoints', 'filters', 'services', 'custom-rules', 'default-rule', 'analytics', 'status-page', 'organizations'],
            'onboarding': {
                'software': ['gui-setup-utility', 'command-line-daemon'],
                'supported-platforms': ['windows', 'macos', 'linux', 'android', 'ios', 'browsers', 'routers', 'windows-server'],
                'provisioning': ['self-provisioning', 'mass-provisioning']
            },
            'troubleshooting': ['ip-not-authorized', 'high-latency', 'no-internet', 'check-dns', 'activity-log', 'captive-portals', 'ip-mismatch', 'lost-password', 'browser-dns', 'icloud-relay', 'geo-blocking'],
            'guides': {
                'router-guides': ['asus', 'netgear', 'linksys', 'dlink', 'tplink', 'ddwrt', 'freshtomato', 'fritz'],
                'integration': ['active-directory', 'tailscale', 'glient', 'okta']
            }
        }
        
        # Create output directory structure
        self.create_directory_structure()

    def create_directory_structure(self):
        """Create the directory structure based on Control D's documentation structure"""
        def create_section(path, section):
            if isinstance(section, dict):
                for subsection, content in section.items():
                    subpath = os.path.join(path, subsection)
                    os.makedirs(subpath, exist_ok=True)
                    create_section(subpath, content)
            elif isinstance(section, list):
                os.makedirs(path, exist_ok=True)

        os.makedirs(self.output_dir, exist_ok=True)
        for section, content in self.sections.items():
            section_path = os.path.join(self.output_dir, section)
            create_section(section_path, content)

    def get_section_from_url(self, url):
        """Determine the correct section for a given URL"""
        path = urlparse(url).path.lower()
        path = path.replace('/docs/', '').strip('/')
        
        # Map URL path to section structure
        for section, content in self.sections.items():
            if section in path:
                if isinstance(content, dict):
                    for subsection in content.keys():
                        if subsection in path:
                            return f"{section}/{subsection}"
                return section
                
        return ''  # Default to root if no section matches

    def get_output_path(self, url):
        parsed_url = urlparse(url)
        path = parsed_url.path.lower()
        
        # Remove /docs/ prefix and leading slash
        path = path.replace('/docs/', '')
        if path.startswith('/'):
            path = path[1:]
            
        # Get the appropriate section
        section = self.get_section_from_url(url)
        
        # Handle index pages
        if path == '' or path.endswith('/'):
            path += 'index'
            
        # Clean up the path
        path = path.replace('edit/', '')
        
        # Add .mdx extension for Mintlify
        if not path.endswith('.mdx'):
            path = path.rstrip('.md') + '.mdx'
        
        # Join with output directory and section
        if section:
            return os.path.join(self.output_dir, section, os.path.basename(path))
        return os.path.join(self.output_dir, path)

    def should_process_url(self, url):
        parsed_url = urlparse(url)
        path = parsed_url.path.lower()
        
        # Only process URLs from the docs section
        if not url.startswith(self.base_url):
            return False
            
        # Skip certain paths
        skip_paths = [
            '/search',
            '/login',
            '/signup',
            'edit/'
        ]
        
        for skip in skip_paths:
            if skip in path:
                return False
                
        return True

    def get_page_content(self, url):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            time.sleep(1)  # Be nice to the server
            return response.text
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None

    def extract_links(self, html_content, base_url):
        soup = BeautifulSoup(html_content, 'html.parser')
        links = []
        
        # Find all links in the navigation menu
        nav_links = soup.select('nav a[href]')
        for link in nav_links:
            href = link['href']
            full_url = urljoin(base_url, href)
            if self.should_process_url(full_url):
                links.append(full_url)
        
        # Find all other documentation links
        content_links = soup.select('main a[href]')
        for link in content_links:
            href = link['href']
            full_url = urljoin(base_url, href)
            if self.should_process_url(full_url):
                links.append(full_url)
        
        return list(set(links))  # Remove duplicates

    def convert_to_markdown(self, html_content):
        # Remove navigation elements and other non-content areas
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove header, navigation, and footer
        for element in soup.select('header, nav, footer, .search-container, .theme-switch'):
            if element:
                element.decompose()
        
        # Get the main content
        main_content = soup.select_one('main, article, .content')
        if main_content:
            html_content = str(main_content)
        
        markdown = self.h2t.handle(html_content)
        
        # Clean up the markdown
        markdown = re.sub(r'\n{3,}', '\n\n', markdown)
        
        # Ensure proper tag closing for Mintlify components
        markdown = re.sub(r'<(Tip|Note|Warning|Info|Tab|Tabs)([^>]*)>(?!.*?</\1>)', r'<\1\2></\1>', markdown)
        
        return markdown

    def extract_frontmatter(self, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Try to find title in specific order
        title = None
        for selector in ['h1', '.page-title', '.title']:
            title_elem = soup.select_one(selector)
            if title_elem:
                title = title_elem.text.strip()
                break
        
        if not title:
            title = "Untitled"
        
        # Extract description
        description = ""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            description = meta_desc.get('content', '')
        elif soup.find('p'):
            description = soup.find('p').text.strip()[:160]
        
        # Determine icon based on content
        icon = self.determine_icon(title, soup.get_text())
        
        return {
            'title': title,
            'description': description,
            'icon': icon
        }

    def determine_icon(self, title, content):
        title_content = (title + " " + content).lower()
        
        icon_mapping = {
            'security': 'shield',
            'network': 'network',
            'guide': 'book-open',
            'troubleshoot': 'bug',
            'analytics': 'chart',
            'profile': 'user',
            'device': 'computer',
            'filter': 'filter',
            'rule': 'code',
            'organization': 'building',
            'dns': 'server',
            'api': 'api',
            'setup': 'wrench',
            'install': 'download',
            'config': 'gear'
        }
        
        for keyword, icon in icon_mapping.items():
            if keyword in title_content:
                return icon
                
        return 'book'

    def process_page(self, url):
        if url in self.visited_urls or not self.should_process_url(url):
            return
            
        self.visited_urls.add(url)
        print(f"Processing: {url}")
        
        html_content = self.get_page_content(url)
        if not html_content:
            return

        # Convert to markdown
        markdown = self.convert_to_markdown(html_content)
        
        # Extract frontmatter
        frontmatter = self.extract_frontmatter(html_content)
        
        # Create frontmatter string
        frontmatter_str = "---\n"
        for key, value in frontmatter.items():
            frontmatter_str += f"{key}: \"{value}\"\n"
        frontmatter_str += "---\n\n"

        # Combine frontmatter and content
        full_markdown = frontmatter_str + markdown

        # Get output path and create directory
        output_path = self.get_output_path(url)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save the file
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_markdown)
            print(f"Saved: {output_path}")
        except Exception as e:
            print(f"Error saving {output_path}: {e}")

        # Extract and process links
        links = self.extract_links(html_content, url)
        for link in links:
            self.process_page(link)

    def scrape(self):
        print(f"Starting scrape of {self.base_url}")
        print(f"Output directory: {self.output_dir}")
        self.process_page(self.base_url)
        print("Scrape completed!")

if __name__ == "__main__":
    scraper = ControlDDocsScraper()
    scraper.scrape() 