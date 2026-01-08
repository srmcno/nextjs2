# LakeScope - Environmental Analysis Platform

LakeScope is a comprehensive, interactive web application for analyzing lakes and watersheds. It provides advanced visualization, data analysis, and reporting tools for environmental monitoring, land use planning, and economic impact assessment.

## 🌟 Features

### Data Visualization
- **Interactive 3D Map Canvas** - Visualize lake bathymetry with elevation contours
- **Real-time Flood Simulation** - Model flooding scenarios and assess impact
- **Land Use Zones** - Display and analyze different land use categories
- **Multiple Views** - Overview, Elevation, Economic, Land Planning, Water Quality, and Analysis Tools

### Export & Sharing
- **CSV Export** - Download lake metrics and economic data
- **GeoJSON Export** - Export geographic data for GIS applications
- **Map Screenshots** - Capture current map view as PNG
- **Share Links** - Generate URLs to share specific views
- **Bookmarks** - Save and reload favorite views

### Interactive Tools
- **Zoom Controls** - Zoom in/out with visual feedback (50%-300%)
- **Map Controls** - Center map, reset view, pan controls
- **Layer Toggles** - Show/hide elevation contours and land use zones
- **Flood Analysis** - Adjust water levels and see real-time impact calculations

### Analysis Features
- Quick calculations (shoreline per acre, average depth, runoff ratios)
- Economic impact analysis ($28.5M annual impact)
- Water quality monitoring (pH, dissolved oxygen, turbidity)
- Visitor statistics and revenue breakdown
- Property value analysis and growth trends

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/srmcno/nextjs2.git
cd nextjs2

# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:3000
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## 📊 Sample Data

Currently features detailed data for **Sardis Lake, Oklahoma**:
- Location: Pushmataha/Latimer County
- Surface Area: 14,360 acres
- Shoreline: 117 miles
- Max Depth: 55.2 feet
- Normal Pool: 599 ft elevation
- Annual Visitors: 425,000
- Economic Impact: $28.5M

## 🛠️ Technology Stack

- **Framework**: Next.js 16.1.1 with App Router
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Language**: TypeScript 5
- **Canvas Rendering**: HTML5 Canvas API

## 📖 Usage Guide

### Navigation
1. **Tabs** - Switch between different analysis views
2. **Zoom Controls** - Use +/- buttons in top right
3. **Layer Toggle** - Enable/disable map layers in top left
4. **Flood Slider** - Adjust water levels in Elevation tab

### Exporting Data
1. Go to **Analysis Tools** tab
2. Choose export format:
   - **CSV**: Lake metrics and statistics
   - **GeoJSON**: Geographic coordinates
   - **Screenshot**: Current map view
3. Click export button - file downloads automatically

### Bookmarking Views
1. Navigate to desired view and settings
2. Go to **Analysis Tools** tab
3. Click **Save Current View**
4. Enter a name for the bookmark
5. Load bookmarks from the list below

### Sharing
1. Set up your desired view
2. Click **Generate Share Link**
3. Link is copied to clipboard
4. Share URL includes all current settings

## 🔧 Configuration

The app uses static data defined in `app/page.tsx`. To add your own lake:

1. Update `SARDIS_LAKE_DATA` with your lake's information
2. Modify `ELEVATION_CONTOURS` for bathymetry
3. Update `ECONOMIC_DATA` and `WATER_QUALITY` as needed

## 🎯 Future Enhancements

- [ ] Real-time USGS/NOAA data integration
- [ ] Weather API integration
- [ ] User authentication and saved profiles
- [ ] Multi-lake database support
- [ ] Advanced measurement tools (distance, area, viewshed)
- [ ] Collaborative annotations and comments
- [ ] Mobile-responsive design
- [ ] Offline PWA support
- [ ] PDF report generation
- [ ] Historical data comparisons

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ using Next.js and React
