# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Phase 2 Atlassian Design System implementation for AIAdvisor
- MarketSelectionWizard integration in setup wizard
- Portfolio settings reset functionality
- Japanese mutual fund name display support
- Netflix/Uber-style dark theme with mobile optimization
- Multi-language support (Japanese/English)
- AWS Secrets Manager integration for API security
- Cloudflare Pages migration from Netlify

### Fixed
- i18n translation resources loading in production
- Tree shaking sideEffects configuration for Atlassian components
- SettingsChecker Router context errors
- JSON import data normalization
- Authentication emergency recovery
- React DOM configuration and GitHub Actions workflow
- CSS loading issues on Cloudflare Pages

### Changed
- Tab navigation Settings button replaced with AI Investment Strategy
- Backend messages organized in document/message folder
- API endpoints made private with config-based retrieval
- Homepage setting changed to absolute path

### Deprecated
- Netlify deployment support (migrated to Cloudflare Pages)

## [2025-08-22] - Phase 2 Release

### Added
- Complete Atlassian Design System implementation
- Dashboard & AI strategy tab UI overhaul
- Comprehensive design system documentation
- System integrity validation for Atlassian components

### Fixed
- Component tree shaking configuration
- Import function errors

## [2025-06-04] - Initial Setup Wizard

### Added
- Market selection wizard
- Portfolio reset functionality
- Japanese mutual fund support
- Initial setup wizard integration

### Fixed
- Router context error handling
- Deprecated function updates

## [2025-06-02] - Dark Theme & Mobile

### Added
- Netflix/Uber-inspired dark theme
- Complete mobile responsiveness
- Multi-language support (JP/EN)
- Modern UI/UX improvements

### Fixed
- JSON import normalization
- Import function errors

## [2025-05-29] - Infrastructure Migration

### Added
- Cloudflare Pages deployment
- AWS Secrets Manager integration
- API privacy layer
- CORS configuration for new infrastructure

### Fixed
- Authentication system recovery
- Frontend config retrieval
- CSS loading on Cloudflare Pages
- GitHub Actions environment variables

### Changed
- Migrated from Netlify to Cloudflare Pages
- API configuration to server-side management

### Removed
- Netlify-specific configurations
- Direct API key exposure in client

## [2025-05-28] - Security Enhancements

### Added
- Public API protection middleware
- Security best practices documentation
- Environment-based configuration system

### Fixed
- Authentication flow issues
- Config API responses

## [2025-05-27] - Initial Public Release

### Added
- Core portfolio management functionality
- Market data integration
- Google OAuth authentication
- Google Drive backup/restore
- Real-time portfolio tracking
- AI prompt generation for investment analysis

### Technical Stack
- Frontend: React 18, TailwindCSS, Recharts
- Backend: AWS Lambda, DynamoDB, Serverless Framework
- Authentication: Google OAuth 2.0
- Hosting: Cloudflare Pages (frontend), AWS (backend)

---

## Version History

### Versioning Strategy
This project follows semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes (backwards compatible)

### Release Cycle
- Feature releases: Monthly
- Security patches: As needed
- Major versions: Quarterly (as needed)

### Support Policy
- Latest version: Full support
- Previous minor version: Security patches only
- Older versions: Community support

## Migration Guides

### Migrating from Netlify to Cloudflare Pages (v2025-05-29)
1. Update environment variables in Cloudflare dashboard
2. Change deployment scripts to use Wrangler CLI
3. Update CORS settings for new domain

### Upgrading to Atlassian Design System (v2025-08-22)
1. Install new dependencies: `npm install @atlaskit/tokens @atlaskit/button`
2. Update component imports from custom to Atlassian
3. Apply new theme tokens to existing styles

## Breaking Changes

### v2025-08-22
- Custom button components replaced with Atlassian Design System
- Theme token system changed
- Some CSS classes deprecated

### v2025-05-29
- API configuration moved to server-side
- Direct API key usage removed from client
- Netlify functions replaced with AWS Lambda

## Deprecation Notices

### Scheduled for Removal
- Legacy import formats (CSV without headers) - Remove in v2026-01-01
- Direct API key configuration - Already removed
- Custom UI components - Migrating to Atlassian Design System

## Contributors

- Development Team
- UI/UX Team
- Security Team
- Infrastructure Team

---

For detailed technical documentation, see [Technical Specifications](./documents/TECHNICAL.md)
For API changes, see [API Documentation](./documents/api-specification.md)