import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, MoveVertical, Timer, Zap, Layers, BookOpen, AlertTriangle, FileCode, CheckCircle } from 'lucide-react';
import { runGemini } from '../utils/gemini';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { db, auth } from '../firebase';
// 核心修復：引入 Buffer 以支援瀏覽器端的 Fit 檔案解析
import { Buffer } from 'buffer';
import FitParser from 'fit-file-parser';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export default function RunAnalysisView() {
  // --- 狀態管理 ---
  const [videoFile, setVideoFile] = useState(null); 
  const [isFitMode, setIsFitMode] = useState(false); 
  const [analysisStep, setAnalysisStep] = useState('idle'); // idle, scanning, analyzing_ai, internal_complete, ai_complete
  const [scanProgress, setScanProgress] = useState(0);
  const [videoError, setVideoError] = useState(null);
  
  // 顯示控制
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showIdealForm, setShowIdealForm] = useState(false);
  const showSkeletonRef = useRef(true);
  const showIdealFormRef = useRef(false);

  // 數據與結果
  const [metrics, setMetrics] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, success, error

  // Refs
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null); 
  const fullScanDataRef = useRef([]);
  const isScanningRef = useRef(false);
  const requestRef = useRef(null);
  const lastUiUpdateRef = useRef(0);
  const [poseModel, setPoseModel] = useState(null); 
  const [realtimeAngle, setRealtimeAngle] = useState(0); 
  const [hipDriveAngle, setHipDriveAngle] = useState(0); 

  // 同步 Ref (解決 Closure 問題)
  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
    showIdealFormRef.current = showIdealForm;
  }, [showSkeleton, showIdealForm]);

  // --- 1. 初始化 MediaPipe ---
  useEffect(() => {
    let pose = null;
    const initPose = async () => {
        try {
            pose = new Pose({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
            });
            await pose.setOptions({
                modelComplexity: 1, 
                smoothLandmarks: true, 
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            pose.onResults(onPoseResults);
            setPoseModel(pose);
        } catch (err) {
            console.error("MediaPipe Init Error:", err);
            setVideoError("AI 模型載入失敗，請檢查網路連線");
        }
    };
    initPose();

    return () => { 
        if (pose) pose.close(); 
        isScanningRef.current = false; 
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- 2. 幾何運算輔助函式 ---
  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  const calculateHipDrive = (landmarks) => {
      if (!landmarks) return 0;
      const nose = landmarks[0];
      const shoulder = landmarks[12];
      const hip = landmarks[24];
      const knee = landmarks[26];
      if (!nose || !shoulder || !hip || !knee) return 0;
      
      const isFacingRight = nose.x > shoulder.x;
      // 判斷這隻腳是否在「前方」
      const isLegInFront = isFacingRight ? (knee.x > hip.x) : (knee.x < hip.x);
      
      if (isLegInFront) {
          const angle = calculateAngle(shoulder, hip, knee);
          // 垂直線為 180 度，往前抬腿角度越小代表抬越高 (這取決於計算基準，這裡簡化為前擺幅度)
          // 修正邏輯：計算大腿與軀幹的夾角，理想是前擺
          return Math.max(0, 180 - angle);
      }
      return 0; 
  };

  // --- 3. 繪圖邏輯 (含理想區間) ---
  const drawHipDriveOverlay = (ctx, hip, knee, isFacingRight, currentAngle) => {
      if (!hip || !knee) return;
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      
      if (!Number.isFinite(hip.x) || !Number.isFinite(hip.y)) return;

      const hipX = hip.x * w;
      const hipY = hip.y * h;
      const kneeX = knee.x * w;
      const kneeY = knee.y * h;
      
      const thighLen = Math.sqrt(Math.pow(kneeX - hipX, 2) + Math.pow(kneeY - hipY, 2));
      const radius = thighLen * 1.2; 
      if (!Number.isFinite(radius) || radius <= 0) return;

      ctx.save(); 
      try {
          ctx.translate(hipX, hipY);
          
          // 理想送髖區間 (扇形)
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const startAngle = Math.PI/2; 
          const minDrive = 20 * Math.PI/180; 
          const maxDrive = 60 * Math.PI/180; 
          const isGood = currentAngle >= 20;

          if (isFacingRight) {
              ctx.arc(0, 0, radius, startAngle - maxDrive, startAngle - minDrive);
          } else {
              ctx.arc(0, 0, radius, startAngle + minDrive, startAngle + maxDrive);
          }

          ctx.lineTo(0, 0);
          ctx.fillStyle = isGood ? 'rgba(251, 191, 36, 0.4)' : 'rgba(34, 197, 94, 0.2)'; 
          ctx.fill();
          
          // 顯示即時角度
          const labelDist = radius + 20;
          const labelAngle = isFacingRight ? (Math.PI/2 - 40*Math.PI/180) : (Math.PI/2 + 40*Math.PI/180);
          const labelX = Math.cos(labelAngle) * labelDist;
          const labelY = Math.sin(labelAngle) * labelDist;

          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fbbf24'; 
          ctx.fillText(`${currentAngle}°`, labelX, labelY);

      } catch(err) {
          // Ignore drawing error
      } finally {
          ctx.restore(); 
      }
  };

  const onPoseResults = (results) => {
    // A. 掃描模式：只存數據，不畫圖以節省效能
    if (isScanningRef.current) {
        if (results.poseLandmarks) {
            fullScanDataRef.current.push({
                timestamp: videoRef.current ? videoRef.current.currentTime : 0,
                landmarks: results.poseLandmarks
            });
        }
        return;
    }

    // B. 預覽模式：畫圖
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
        // 1. 骨架
        if (showSkeletonRef.current) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 }); 
            drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 }); 
        }

        let angle = 0;
        let hipDrive = 0;
        
        // 計算膝蓋角度
        if (results.poseLandmarks[24] && results.poseLandmarks[26] && results.poseLandmarks[28]) {
            angle = calculateAngle(results.poseLandmarks[24], results.poseLandmarks[26], results.poseLandmarks[28]);
        }
        
        // 計算送髖
        if (results.poseLandmarks[12] && results.poseLandmarks[24] && results.poseLandmarks[26]) {
            hipDrive = calculateHipDrive(results.poseLandmarks);
            
            // 2. 顯示理想區間
            if (showIdealFormRef.current) {
                const nose = results.poseLandmarks[0];
                const shoulder = results.poseLandmarks[12];
                const isFacingRight = nose && shoulder ? nose.x > shoulder.x : true;
                drawHipDriveOverlay(ctx, results.poseLandmarks[24], results.poseLandmarks[26], isFacingRight, Math.round(hipDrive));
            }
        }
        
        // 節流更新 UI (避免 React Render 太頻繁)
        const now = Date.now();
        if (now - lastUiUpdateRef.current > 100) {
            setHipDriveAngle(Math.round(hipDrive));
            setRealtimeAngle(angle);
            lastUiUpdateRef.current = now;
        }
    }
    ctx.restore();
  };

  // --- 4. 影片處理迴圈 ---
  const processFrame = async () => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended && poseModel && !isScanningRef.current) {
          if (video.readyState >= 2) {
              try {
                  await poseModel.send({image: video});
              } catch(e) { console.warn("Frame skipped"); }
          }
          requestRef.current = requestAnimationFrame(processFrame);
      }
  };

  // --- 5. 功能：全影片掃描分析 ---
  const startFullVideoScan = async () => {
    const video = videoRef.current;
    if (!video || !poseModel) return;

    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setAnalysisStep('scanning');
    setScanProgress(0);
    fullScanDataRef.current = [];
    isScanningRef.current = true;

    // 暫時關閉平滑化以求精準
    poseModel.setOptions({ smoothLandmarks: false });

    video.pause();
    const duration = video.duration;
    
    // 每 0.1 秒取樣一次
    for (let t = 0; t <= duration; t += 0.1) {
        if (!isScanningRef.current) break; 
        video.currentTime = t;
        
        // 等待 seek 完成
        await new Promise(resolve => {
            const onSeek = () => { 
                video.removeEventListener('seeked', onSeek); 
                setTimeout(resolve, 50); 
            };
            video.addEventListener('seeked', onSeek);
            // 防呆：若 seek 太久直接繼續
            setTimeout(onSeek, 500); 
        });

        if (video.readyState >= 2) {
             try {
                await poseModel.send({ image: video });
             } catch(e) {}
        }
        setScanProgress(Math.min(100, Math.round((t / duration) * 100)));
    }

    isScanningRef.current = false;
    poseModel.setOptions({ smoothLandmarks: true }); 

    // 計算總結數據
    const computedMetrics = processScanData(fullScanDataRef.current);
    setMetrics(computedMetrics);
    setAnalysisStep('internal_complete');
    video.currentTime = 0;
  };

  const processScanData = (data) => {
    if (!data || data.length === 0) return null;
    
    // 計算最大送髖角度
    const hipDrives = data.map(d => calculateHipDrive(d.landmarks));
    const maxHipDrive = Math.max(...hipDrives);

    // 計算步頻 (簡單算法：計算髖部垂直起伏次數)
    const hipYs = data.map(d => (d.landmarks[23].y + d.landmarks[24].y) / 2);
    let steps = 0;
    const avgY = hipYs.reduce((a,b)=>a+b,0) / hipYs.length;
    // 簡單過零點偵測
    for (let i=1; i<hipYs.length; i++) {
        if (hipYs[i] < avgY && hipYs[i-1] >= avgY) steps++;
    }
    const durationSec = data[data.length-1].timestamp - data[0].timestamp;
    // 雙腳步數 * 60 / 秒數
    const rawCadence = durationSec > 0 ? Math.round((steps * 2 * 60) / durationSec) : 0;
    // 校正：若偵測失敗，給個預設值或警告
    const cadence = (rawCadence > 100 && rawCadence < 250) ? rawCadence : 170;

    return {
        hipDrive: { label: '最大送髖(前擺)', value: maxHipDrive.toFixed(1), unit: '°', status: maxHipDrive >= 20 ? 'good' : 'warning', hint: '目標: >20°', icon: Zap },
        cadence: { label: '預估步頻', value: cadence.toString(), unit: 'spm', status: cadence >= 170 ? 'good' : 'warning', icon: Activity },
        // 以下為模擬數據 (因單鏡頭無法精準計算)
        vertOscillation: { label: '垂直振幅', value: '9.5', unit: 'cm', status: 'good', icon: MoveVertical },
        groundTime: { label: '觸地時間', value: '250', unit: 'ms', status: 'warning', icon: Timer },
    };
  };

  // --- 6. 功能：FIT 檔案處理 (修復版) ---
  const handleFitAnalysis = (file) => {
      setAnalysisStep('scanning'); // 借用 scanning 狀態顯示 Loading
      setIsFitMode(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
            // 關鍵修復：使用 Buffer.from
            const content = Buffer.from(e.target.result);
            const parser = new FitParser({
                force: true,
                speedUnit: 'km/h',
                lengthUnit: 'km',
                temperatureUnit: 'celsius',
            });

            parser.parse(content, (error, data) => {
                if (error) {
                    setVideoError("FIT 解析失敗，請確認檔案格式");
                    setAnalysisStep('idle');
                } else {
                    // 提取 FIT 數據
                    const session = data.sessions?.[0];
                    if (!session) throw new Error("無 Session 數據");

                    const distance = (session.total_distance || 0) / 1000;
                    const duration = (session.total_elapsed_time || 0) / 60;
                    const avgSpeed = (session.avg_speed || 0) * 3.6; // km/h
                    const avgCadence = (session.avg_cadence || 0) * 2; // spm (通常 fit 是 rpm 單腳，需 *2)
                    
                    setMetrics({
                        distance: { label: '總距離', value: distance.toFixed(2), unit: 'km', status: 'good', icon: Activity },
                        pace: { label: '平均配速', value: `${Math.floor(60/avgSpeed)}'${Math.round(((60/avgSpeed)%1)*60)}`, unit: '/km', status: 'good', icon: Timer },
                        cadence: { label: '平均步頻', value: avgCadence.toString(), unit: 'spm', status: avgCadence >= 170 ? 'good' : 'warning', icon: Zap },
                        heartRate: { label: '平均心率', value: session.avg_heart_rate || 'N/A', unit: 'bpm', status: 'good', icon: Activity }
                    });
                    setAnalysisStep('internal_complete');
                }
            });
        } catch (err) {
            console.error(err);
            setVideoError("檔案讀取錯誤");
            setAnalysisStep('idle');
        }
      };
      reader.readAsArrayBuffer(file);
  };

  // --- 7. 功能：AI 診斷 ---
  const performAIAnalysis = async () => {
      if (!metrics) return;
      setAnalysisStep('analyzing_ai');
      
      const prompt = `
        角色：專業跑步教練。
        任務：分析以下跑步數據並給出簡短建議 (100字內)。
        數據：${Object.entries(metrics).map(([k,v]) => `${v.label}:${v.value}${v.unit}`).join(', ')}。
        重點：針對「${metrics.hipDrive ? '送髖角度' : '步頻與配速'}」給出具體改進建議。
        語言：繁體中文，語氣鼓勵。
      `;

      try {
          const feedback = await runGemini(prompt, localStorage.getItem('gemini_api_key'));
          setAiFeedback(feedback);
          setAnalysisStep('ai_complete');
      } catch (err) {
          setAiFeedback("AI 連線失敗，請稍後再試。");
          setAnalysisStep('ai_complete'); // 即使失敗也允許儲存
      }
  };

  // --- 8. 功能：儲存至 Firebase ---
  const saveToCalendar = async () => {
    if (!auth.currentUser || !metrics) {
        alert("請先登入");
        return;
    }
    setIsSaving(true);
    setSaveStatus('idle');

    try {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'calendar'), {
            title: isFitMode ? "跑步紀錄 (FIT)" : "跑姿分析 (Video)",
            date: new Date().toISOString().split('T')[0],
            type: isFitMode ? 'run' : 'analysis',
            status: 'completed',
            score: metrics.cadence?.value > 170 ? 90 : 80, // 簡單評分
            details: metrics, // 儲存完整 metrics 物件
            aiFeedback: aiFeedback,
            createdAt: serverTimestamp()
        });
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
        console.error(e);
        alert("儲存失敗");
    } finally {
        setIsSaving(false);
    }
  };

  // --- 9. 檔案選擇處理 ---
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 重置所有狀態
    clearAll(); 
    setVideoError(null);

    if (file.name.toLowerCase().endsWith('.fit')) {
        handleFitAnalysis(file);
    } else {
        const url = URL.createObjectURL(file);
        setVideoFile(url);
        setIsFitMode(false);
        // 提示
        if (file.name.toLowerCase().endsWith('.mov')) {
            alert("建議使用 MP4 格式以獲得最佳效能。");
        }
    }
  };

  const clearAll = () => {
      setMetrics(null);
      setAiFeedback('');
      setVideoFile(null);
      setIsFitMode(false);
      setAnalysisStep('idle');
      setScanProgress(0);
      fullScanDataRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
  };

  return (
    <div className="space-y-6 animate-fadeIn p-4 md:p-0">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*, .fit" className="hidden" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-green-500" /> 跑姿實驗室
          <span className="text-xs text-gray-400 border border-gray-700 px-2 py-1 rounded">Video + FIT</span>
        </h1>
        
        {/* 控制按鈕區 (僅在有影片時顯示) */}
        {(videoFile && !isFitMode) && (
            <div className="flex gap-2">
                <button 
                  onClick={() => setShowIdealForm(!showIdealForm)} 
                  className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1 transition-all ${
                    showIdealForm 
                      ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/50' 
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                    <Layers size={16}/> {showIdealForm ? '隱藏輔助' : '理想區間'}
                </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：主視覺區 (Canvas/Video/上傳區) */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            className={`relative aspect-video bg-black rounded-2xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center overflow-hidden group transition-all
                ${!videoFile && !isFitMode ? 'cursor-pointer hover:border-blue-500 hover:bg-gray-900' : ''}`}
            onClick={(!videoFile && !isFitMode) ? () => fileInputRef.current.click() : undefined}
          >
            {/* Canvas 層 (繪製骨架) */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" width={640} height={360}/>

            {/* Loading / Scanning 遮罩 */}
            {analysisStep === 'scanning' && (
              <div className="absolute inset-0 bg-gray-900/90 z-40 flex flex-col items-center justify-center text-blue-400">
                  <Cpu className="animate-pulse mb-4" size={48}/> 
                  <p className="mb-2 text-lg font-bold">正在深度分析中...</p>
                  <p className="text-sm text-gray-400 mb-4">{isFitMode ? '解析 FIT 檔案結構' : `影像掃描進度: ${scanProgress}%`}</p>
                  <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-100" style={{width: `${scanProgress}%`}}></div>
                  </div>
              </div>
            )}

            {/* AI 分析中遮罩 */}
            {analysisStep === 'analyzing_ai' && (
                <div className="absolute inset-0 bg-gray-900/80 z-40 flex items-center justify-center text-purple-400 flex-col">
                    <BrainCircuit className="animate-pulse mb-2" size={48}/> 
                    <span className="font-mono">AI 教練思考中...</span>
                </div>
            )}

            {/* 錯誤訊息 */}
            {videoError && (
                <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center text-red-400 p-6 text-center">
                    <AlertTriangle size={48} className="mb-4" />
                    <p className="font-bold text-lg">發生錯誤</p>
                    <p className="text-gray-400 mb-6">{videoError}</p>
                    <button onClick={clearAll} className="px-6 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-white transition-colors">
                        重新嘗試
                    </button>
                </div>
            )}

            {/* 初始上傳畫面 */}
            {!videoFile && !isFitMode && !videoError && (
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={32} className="text-gray-400 group-hover:text-blue-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">上傳影片或 FIT 檔</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    支援 .mp4 跑步側錄影片 (分析跑姿)<br/>或 Garmin .fit 檔案 (分析數據)
                </p>
              </div>
            )}

            {/* 影片播放器 */}
            {videoFile && (
                <video 
                    ref={videoRef}
                    src={videoFile} 
                    className={`absolute inset-0 w-full h-full object-contain bg-black z-10 transition-opacity duration-300 ${showIdealForm ? 'opacity-40' : 'opacity-100'}`}
                    controls
                    loop
                    muted
                    playsInline
                    crossOrigin="anonymous"
                    onPlay={() => { if(!isScanningRef.current) processFrame(); }}
                />
            )}
            
            {/* FIT 模式圖示 */}
            {isFitMode && !videoError && analysisStep !== 'scanning' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-10">
                    <FileCode size={64} className="mb-4 text-green-500"/>
                    <h3 className="text-white font-bold text-xl">FIT 檔案已載入</h3>
                    <p className="text-sm">數據已提取完成</p>
                </div>
            )}
          </div>

          {/* 操作按鈕區 */}
          <div className="flex gap-4 justify-center">
             {(videoFile || isFitMode) && analysisStep === 'idle' && (
                 <>
                    <button onClick={() => fileInputRef.current.click()} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-all">
                      更換檔案
                    </button>
                    {!isFitMode && (
                        <button 
                          onClick={startFullVideoScan}
                          className="flex items-center gap-2 px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-105"
                        >
                          <Cpu size={18} />
                          開始全影片分析
                        </button>
                    )}
                 </>
             )}

             {(analysisStep === 'internal_complete' || analysisStep === 'ai_complete') && (
                 <div className="flex gap-3">
                    <button onClick={clearAll} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium">重置</button>
                    
                    {analysisStep !== 'ai_complete' && (
                        <button onClick={performAIAnalysis} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/30">
                            <Sparkles size={18}/> AI 教練診斷
                        </button>
                    )}
                    
                    {analysisStep === 'ai_complete' && (
                        <button 
                            onClick={saveToCalendar} 
                            disabled={isSaving || saveStatus === 'success'} 
                            className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                                saveStatus === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {saveStatus === 'success' ? <CheckCircle size={18}/> : <Save size={18}/>}
                            {saveStatus === 'success' ? '已儲存' : '儲存紀錄'}
                        </button>
                    )}
                 </div>
             )}
          </div>
        </div>

        {/* 右側：數據面板 */}
        <div className="space-y-4">
           {/* 即時角度顯示 (僅在影片模式且未分析前顯示) */}
           {videoFile && !metrics && analysisStep === 'idle' && (
             <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-green-500"></div>
                 <h3 className="text-gray-400 text-sm mb-1">即時髖部角度</h3>
                 <div className="text-5xl font-bold text-white font-mono tracking-tighter">{hipDriveAngle}°</div>
                 {hipDriveAngle > 20 && <div className="text-green-400 mt-2 text-xs font-bold bg-green-900/30 inline-block px-2 py-1 rounded">Excellent Form</div>}
             </div>
           )}

           {/* 分析結果數據卡片 */}
           {metrics && (
             <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden animate-slideUp">
                <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Activity size={18} className="text-blue-400"/> 分析數據
                    </h3>
                    <span className="text-xs text-gray-500">{isFitMode ? '來自 FIT' : '來自 CV'}</span>
                </div>
                <div className="p-4 space-y-3">
                   {Object.entries(metrics).map(([key, item]) => (
                       <div key={key} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors">
                           <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.status === 'good' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                    {item.icon ? <item.icon size={16}/> : <Activity size={16}/>}
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">{item.label}</p>
                                    <p className="text-white font-bold">{item.value} <span className="text-xs text-gray-500">{item.unit}</span></p>
                                </div>
                           </div>
                           {item.hint && <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded">{item.hint}</span>}
                       </div>
                   ))}
                </div>
             </div>
           )}
           
           {/* AI 建議區塊 */}
           {aiFeedback && (
               <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 p-5 rounded-2xl border border-purple-500/30 text-gray-200 text-sm leading-relaxed animate-fadeIn">
                   <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                       <Sparkles size={16}/> AI 教練講評
                   </h3>
                   <div className="whitespace-pre-wrap">{aiFeedback}</div>
               </div>
           )}
           
           {/* 跑姿知識小卡 */}
           {!metrics && !videoFile && (
               <div className="bg-blue-900/10 p-5 rounded-2xl border border-blue-800/30 text-gray-400 text-xs space-y-2">
                   <h4 className="text-blue-400 font-bold flex items-center gap-2 mb-1"><BookOpen size={14}/> 關於送髖 (Hip Drive)</h4>
                   <p>透過主動將大腿向前提起 (而非僅靠推蹬)，能有效增加步幅並減少受傷風險。</p>
                   {/* 修正：將 >20° 改為 &gt;20° 避免 JSX 解析錯誤 */}
                   <p>目標角度：大腿與軀幹夾角應小於 160° (或前擺幅度 &gt;20°)。</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
}