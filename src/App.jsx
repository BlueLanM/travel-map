import { useState, useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'
import { Feature } from 'ol'
import { Point } from 'ol/geom'
import { Style, Icon } from 'ol/style'
import Overlay from 'ol/Overlay'
import './App.css'
import placesData from './data/places.json'

function App() {
	const mapRef = useRef(null)
	const mapInstance = useRef(null)
	const vectorSourceRef = useRef(null)
	const overlayRef = useRef(null)
	const hoverOverlayRef = useRef(null)

	const [markers, setMarkers] = useState([])
	const [selectedMarker, setSelectedMarker] = useState(null)
	const [hoveredMarker, setHoveredMarker] = useState(null)
	const [previewImage, setPreviewImage] = useState(null) // 图片预览状态
	const [currentImageIndex, setCurrentImageIndex] = useState(0) // 当前查看的图片索引

	// 从 JSON 文件加载数据
	useEffect(() => {
		if (placesData && placesData.places) {
			setMarkers(placesData.places)
		}
	}, [])

	// 辅助函数：获取地点的图片数组（兼容旧格式）
	const getImages = (marker) => {
		if (marker.images && Array.isArray(marker.images)) {
			return marker.images
		}
		if (marker.image) {
			return [{ url: marker.image, caption: '' }]
		}
		return []
	}

	// 辅助函数：获取第一张图片
	const getFirstImage = (marker) => {
		const images = getImages(marker)
		return images.length > 0 ? images[0].url : null
	}

	// 初始化地图
	useEffect(() => {
		if (!mapRef.current) return

		// 避免重复初始化
		if (mapInstance.current) return

		// 创建向量源和图层
		const vectorSource = new VectorSource()
		vectorSourceRef.current = vectorSource

		const vectorLayer = new VectorLayer({
			source: vectorSource,
		})

		// 创建地图
		const map = new Map({
			target: mapRef.current,
			layers: [
				new TileLayer({
					source: new OSM(),
				}),
				vectorLayer,
			],
			view: new View({
				center: fromLonLat([116.4074, 39.9042]), // 北京坐标
				zoom: 5,
			}),
		})

		mapInstance.current = map

		// 创建弹出框元素（不通过 React 管理）
		const popupElement = document.createElement('div')
		popupElement.className = 'ol-popup'
		popupElement.style.display = 'none'

		const overlay = new Overlay({
			element: popupElement,
			positioning: 'bottom-center',
			stopEvent: false,
			offset: [0, -50],
			autoPan: false,
		})
		map.addOverlay(overlay)
		overlayRef.current = { overlay, element: popupElement }

		// 创建悬停弹出框元素（不通过 React 管理）
		const hoverElement = document.createElement('div')
		hoverElement.className = 'ol-hover-popup'
		hoverElement.style.display = 'none'

		const hoverOverlay = new Overlay({
			element: hoverElement,
			positioning: 'bottom-center',
			stopEvent: false,
			offset: [0, -50],
			autoPan: false,
		})
		map.addOverlay(hoverOverlay)
		hoverOverlayRef.current = { overlay: hoverOverlay, element: hoverElement }

    // 点击地图标记显示详情
    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature)
      
      if (feature) {
        // 点击已有标记，显示详情
        const markerId = feature.get('id')
        const markerData = feature.get('markerData')
        setSelectedMarker(markerData)
        if (overlayRef.current) {
          overlayRef.current.overlay.setPosition(evt.coordinate)
        }
      }
    })

    // 鼠标移动事件 - 悬停显示信息
    map.on('pointermove', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature)
      
      if (feature) {
        map.getTargetElement().style.cursor = 'pointer'
        const markerData = feature.get('markerData')
        if (markerData && hoverOverlayRef.current) {
          setHoveredMarker(markerData)
          hoverOverlayRef.current.overlay.setPosition(evt.coordinate)
        }
      } else {
        map.getTargetElement().style.cursor = ''
        setHoveredMarker(null)
        if (hoverOverlayRef.current) {
          hoverOverlayRef.current.overlay.setPosition(undefined)
        }
      }
    })

		return () => {
			if (map) {
				map.setTarget(null)
			}
		}
	}, [])

	// 更新标记
	useEffect(() => {
		if (!vectorSourceRef.current) return

		vectorSourceRef.current.clear()

		markers.forEach((marker) => {
			const feature = new Feature({
				geometry: new Point(fromLonLat(marker.coords)),
				id: marker.id,
				markerData: marker, // 存储完整的标记数据
			})

			// 获取标记颜色，如果未指定则使用默认红色
			const markerColor = marker.markerColor || '#2196F3'

			// 直接在 SVG 中使用颜色值
			const svgString = `<svg width="32" height="40" xmlns="http://www.w3.org/2000/svg">
				<path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24c0-8.8-7.2-16-16-16z" 
					fill="${markerColor}" stroke="#FFFFFF" stroke-width="2"/>
				<circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
			</svg>`

			// 创建自定义图标样式
			feature.setStyle(
				new Style({
					image: new Icon({
						anchor: [0.5, 1],
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString),
						scale: 1,
					}),
				})
			)

			vectorSourceRef.current.addFeature(feature)
		})
	}, [markers])


	// 更新弹出框内容 - 支持多图片画廊
	useEffect(() => {
		if (!overlayRef.current) return

		const { element, overlay } = overlayRef.current

		if (selectedMarker) {
			const images = getImages(selectedMarker)
			const currentIndex = currentImageIndex < images.length ? currentImageIndex : 0
			
			if (images.length > 0) {
				const currentImg = images[currentIndex]
				const hasMultiple = images.length > 1
				
				element.innerHTML = `
					<div class="popup-content">
						<button class="popup-closer" onclick="window.closePopup()">×</button>
						<h3>${selectedMarker.name}</h3>
						<div class="image-gallery">
							<div class="gallery-main">
								<img src="${currentImg.url}" alt="${selectedMarker.name}" class="popup-image" onclick="window.previewImage('${currentImg.url}')" />
								${hasMultiple ? `
									<button class="gallery-nav gallery-prev" onclick="window.changeImage(-1)">‹</button>
									<button class="gallery-nav gallery-next" onclick="window.changeImage(1)"> ›</button>
								` : ''}
							</div>
							${currentImg.caption ? `<p class="image-caption">${currentImg.caption}</p>` : ''}
							${hasMultiple ? `
								<div class="gallery-dots">
									${images.map((_, index) => `
										<span class="gallery-dot ${index === currentIndex ? 'active' : ''}" onclick="window.setImageIndex(${index})"></span>
									`).join('')}
								</div>
								<div class="gallery-counter">${currentIndex + 1} / ${images.length}</div>
							` : ''}
						</div>
						${selectedMarker.description ? `<p class="popup-description">${selectedMarker.description}</p>` : ''}
					</div>
				`
			} else {
				element.innerHTML = `
					<div class="popup-content">
						<button class="popup-closer" onclick="window.closePopup()">×</button>
						<h3>${selectedMarker.name}</h3>
						${selectedMarker.description ? `<p class="popup-description">${selectedMarker.description}</p>` : ''}
					</div>
				`
			}
			element.style.display = 'block'
		} else {
			element.style.display = 'none'
			overlay.setPosition(undefined)
			setCurrentImageIndex(0)
		}
	}, [selectedMarker, currentImageIndex])

	// 更新悬停弹出框内容
	useEffect(() => {
		if (!hoverOverlayRef.current) return

		const { element } = hoverOverlayRef.current

		if (hoveredMarker) {
			const images = getImages(hoveredMarker)
			const firstImage = images.length > 0 ? images[0].url : null
			
			element.innerHTML = `
        <div class="hover-popup-content">
          <h4>${hoveredMarker.name}</h4>
          ${firstImage ? `<img src="${firstImage}" alt="${hoveredMarker.name}" class="hover-image" />` : ''}
          ${hoveredMarker.description ? `<p class="hover-description">${hoveredMarker.description}</p>` : ''}
        </div>
      `
			element.style.display = 'block'
		} else {
			element.style.display = 'none'
		}
	}, [hoveredMarker])

	// 全局函数用于关闭弹出框、图片预览和画廊控制
	useEffect(() => {
		window.closePopup = () => {
			setSelectedMarker(null)
		}
		window.previewImage = (imageSrc) => {
			setPreviewImage(imageSrc)
		}
		window.changeImage = (direction) => {
			if (!selectedMarker) return
			const images = getImages(selectedMarker)
			setCurrentImageIndex((prev) => {
				let newIndex = prev + direction
				if (newIndex < 0) newIndex = images.length - 1
				if (newIndex >= images.length) newIndex = 0
				return newIndex
			})
		}
		window.setImageIndex = (index) => {
			setCurrentImageIndex(index)
		}
		return () => {
			delete window.closePopup
			delete window.previewImage
			delete window.changeImage
			delete window.setImageIndex
		}
	}, [selectedMarker])

	return (
		<div className="app-container">
			<div className="header">
				<h1>🗺️ 我的旅行地图</h1>
				<p>点击地图标记查看详情</p>
			</div>

			<div ref={mapRef} className="map-container" />

			{/* 标记列表 */}
			{markers.length > 0 && (
				<div className="markers-list">
					<h3>我去过的地方 ({markers.length})</h3>
					<div className="markers-scroll">
						{markers.map((marker) => {
							const firstImage = getFirstImage(marker)
							return (
								<div
									key={marker.id}
									className="marker-item"
									onClick={() => {
										mapInstance.current.getView().animate({
											center: fromLonLat(marker.coords),
											zoom: 10,
											duration: 1000,
										})
									}}
								>
									{firstImage && (
										<img 
											src={firstImage} 
											alt={marker.name} 
											className="marker-thumb"
											onClick={(e) => {
												e.stopPropagation()
												setPreviewImage(firstImage)
											}}
										/>
									)}
									<div className="marker-info">
										<strong>{marker.name}</strong>
										{marker.description && (
											<small>{marker.description.substring(0, 50)}</small>
										)}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* 图片预览模态框 */}
			{previewImage && (
				<div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
					<div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
						<button className="image-preview-close" onClick={() => setPreviewImage(null)}>
							×
						</button>
						<img src={previewImage} alt="预览" className="image-preview-large" />
					</div>
				</div>
			)}
		</div>
	)
}

export default App
