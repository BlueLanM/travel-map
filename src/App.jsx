import { useState, useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
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
	const [mapType, setMapType] = useState('roadmap') // 地图类型：roadmap, satellite, hybrid, terrain
	const tileLayerRef = useRef(null) // 存储瓦片图层引用
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false) // 侧边栏展开/收起状态

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

		// 创建瓦片图层
		const tileLayer = new TileLayer({
			source: new XYZ({
				url: 'https://mt{0-3}.google.com/vt/lyrs=m&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}',
				attributions: '© Google Maps',
				crossOrigin: 'anonymous',
				maxZoom: 20,
			}),
		})
		tileLayerRef.current = tileLayer

		// 创建地图 - 使用中文地图服务（全球详细地图 + 中文地名）
		const map = new Map({
			target: mapRef.current,
			layers: [tileLayer, vectorLayer],
			view: new View({
				center: fromLonLat([115.03, 35.76]), // 濮阳坐标
				zoom: 4,
				maxZoom: 25, // 最大缩放级别
				minZoom: 3,  // 最小缩放级别
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
			stopEvent: true,
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
						<button class="popup-closer">×</button>
						<h3>${selectedMarker.name}</h3>
						<div class="image-gallery">
							<div class="gallery-main">
								<img src="${currentImg.url}" alt="${selectedMarker.name}" class="popup-image" data-action="preview" data-src="${currentImg.url}" />
								${hasMultiple ? `
									<button class="gallery-nav gallery-prev" data-action="prev">‹</button>
									<button class="gallery-nav gallery-next" data-action="next">›</button>
								` : ''}
							</div>
							${currentImg.caption ? `<p class="image-caption">${currentImg.caption}</p>` : ''}
							${hasMultiple ? `
								<div class="gallery-dots">
									${images.map((_, index) => `
										<span class="gallery-dot ${index === currentIndex ? 'active' : ''}" data-action="dot" data-index="${index}"></span>
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
						<button class="popup-closer">×</button>
						<h3>${selectedMarker.name}</h3>
						${selectedMarker.description ? `<p class="popup-description">${selectedMarker.description}</p>` : ''}
					</div>
				`
			}
			
			// 使用事件委托处理所有点击事件
			const handleClick = (e) => {
				const target = e.target
				
				// 防止触摸设备同时触发 touch 和 click
				e.preventDefault()
				e.stopPropagation()
				
				// 关闭按钮
				if (target.classList.contains('popup-closer')) {
					window.closePopup()
					return
				}
				
				// 图片预览
				if (target.dataset.action === 'preview') {
					window.previewImage(target.dataset.src)
					return
				}
				
				// 上一张
				if (target.dataset.action === 'prev' || target.classList.contains('gallery-prev')) {
					window.changeImage(-1)
					return
				}
				
				// 下一张
				if (target.dataset.action === 'next' || target.classList.contains('gallery-next')) {
					window.changeImage(1)
					return
				}
				
				// 点击圆点
				if (target.dataset.action === 'dot') {
					window.setImageIndex(parseInt(target.dataset.index))
					return
				}
			}
			
			// 处理触摸事件（移动端）
			const handleTouch = (e) => {
				// 只处理单点触摸
				if (e.touches && e.touches.length > 1) return
				handleClick(e)
			}
			
			// 检测是否为触摸设备
			const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
			
			if (isTouchDevice) {
				element.addEventListener('touchstart', handleTouch, { passive: false })
			} else {
				element.addEventListener('click', handleClick)
			}
			
			element.style.display = 'block'
			
			// 清理函数
			return () => {
				if (isTouchDevice) {
					element.removeEventListener('touchstart', handleTouch)
				} else {
					element.removeEventListener('click', handleClick)
				}
			}
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

	// 切换地图类型
	useEffect(() => {
		if (!tileLayerRef.current) return

		// 地图类型参数说明：
		// Google Maps:
		//   m = 标准路线图（中文）
		//   y = 卫星图（带标注，混合）
		//   p = 地形图（带标注）
		// 高德地图:
		//   style=8 = 标准地图
		//   style=6 = 卫星图
		//   交通路况需要叠加实时路况图层
		// const amapKey = import.meta.env.VITE_AMAP_KEY || '5fc6838c280d65dff828f6b092b94057'
		
		const mapTypeUrls = {
			roadmap: 'https://mt{0-3}.google.com/vt/lyrs=m&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}',
			hybrid: 'https://mt{0-3}.google.com/vt/lyrs=y&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}',
			terrain: 'https://mt{0-3}.google.com/vt/lyrs=p&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}',
			// // 高德卫星混合图（卫星影像+道路标注，中国地区）
			// satellite: `https://webst0{1-4}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}&key=${amapKey}`,
		}

		const newSource = new XYZ({
			url: mapTypeUrls[mapType],
			attributions: '© Google Maps',
			crossOrigin: 'anonymous',
			maxZoom: 20,
		})

		tileLayerRef.current.setSource(newSource)
		
		// 强制刷新地图
		if (mapInstance.current) {
			mapInstance.current.render()
		}
	}, [mapType])

	return (
		<div className="app-container">
			<div className="header">
				<h1>LanM旅行地图</h1>
				<p>点击地图标记查看详情</p>
			</div>

			{/* 地图类型切换按钮 */}
			<div className="map-type-selector">
				<button 
					className={mapType === 'roadmap' ? 'active' : ''} 
					onClick={() => setMapType('roadmap')}
					title="标准地图"
				>
					🗺️ 标准
				</button>
				{/* <button 
					className={mapType === 'satellite' ? 'active' : ''} 
					onClick={() => setMapType('satellite')}
					title="卫星混合图（高德-卫星+路注）"
				>
					🛰️ 卫星
				</button> */}
				<button 
					className={mapType === 'hybrid' ? 'active' : ''} 
					onClick={() => setMapType('hybrid')}
					title="混合视图"
				>
					🌍 混合
				</button>
				<button 
					className={mapType === 'terrain' ? 'active' : ''} 
					onClick={() => setMapType('terrain')}
					title="地形图"
				>
					⛰️ 地形
				</button>
			</div>

			<div ref={mapRef} className="map-container" />

			{/* 标记列表 */}
			{markers.length > 0 && (
				<div className={`markers-list ${isSidebarCollapsed ? 'collapsed' : ''}`}>
					<button 
						className="sidebar-toggle" 
						onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
						title={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
					>
						{isSidebarCollapsed ? '◀' : '▶'}
					</button>
					<h3>我去过的地方 ({markers.length})</h3>
					<div className="markers-scroll">
						{/* 家乡分组 */}
						{markers.filter(m => m.description === '家乡').length > 0 && (
							<div className="marker-group">
								<h4 className="group-title">🏠 Home</h4>
								{markers.filter(m => m.description === '家乡').map((marker) => {
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
											{firstImage ? (
												<img 
													src={firstImage} 
													alt={marker.name} 
													className="marker-thumb"
													onClick={(e) => {
														e.stopPropagation()
														setPreviewImage(firstImage)
													}}
												/>
											) : (
												<div className="marker-thumb marker-thumb-empty">
													EMPTY
												</div>
											)}
											<div className="marker-info">
												<strong>{marker.name}</strong>
											</div>
										</div>
									)
								})}
							</div>
						)}

						{/* Life 分组 */}
						{markers.filter(m => m.description === 'Life').length > 0 && (
							<div className="marker-group">
								<h4 className="group-title">💻 Life ({markers.filter(m => m.description === 'Life').length})</h4>
								{markers.filter(m => m.description === 'Life').map((marker) => {
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
											{firstImage ? (
												<img 
													src={firstImage} 
													alt={marker.name} 
													className="marker-thumb"
													onClick={(e) => {
														e.stopPropagation()
														setPreviewImage(firstImage)
													}}
												/>
											) : (
												<div className="marker-thumb marker-thumb-empty">
													EMPTY
												</div>
											)}
											<div className="marker-info">
												<strong>{marker.name}</strong>
											</div>
										</div>
									)
								})}
							</div>
						)}

						{/* Travel 分组 */}
						{markers.filter(m => m.description === 'Travel').length > 0 && (
							<div className="marker-group">
								<h4 className="group-title">✈️ Travel ({markers.filter(m => m.description === 'Travel').length})</h4>
								{markers.filter(m => m.description === 'Travel').map((marker) => {
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
											{firstImage ? (
												<img 
													src={firstImage} 
													alt={marker.name} 
													className="marker-thumb"
													onClick={(e) => {
														e.stopPropagation()
														setPreviewImage(firstImage)
													}}
												/>
											) : (
												<div className="marker-thumb marker-thumb-empty">
													EMPTY
												</div>
											)}
											<div className="marker-info">
												<strong>{marker.name}</strong>
											</div>
										</div>
									)
								})}
							</div>
						)}
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
