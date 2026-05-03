import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, StatusBar, ScrollView, Image, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { polygonAPI } from '../services/api';
import { dbService } from '../services/database';
import { C } from '../theme';

const FILTERS = ['all', 'pending', 'synced', 'failed'];

const MINI_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}#map{width:100vw;height:100vh;background:#f8f9fa}</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='polygon'){
      var coords=d.coords.map(function(c){return[c.lat,c.lng];});
      var poly=L.polygon(coords,{color:'#6f4e37',fillColor:'#6f4e37',fillOpacity:0.5,weight:2}).addTo(map);
      map.fitBounds(poly.getBounds().pad(0.2));
    }
  }catch(err){}
});
</script>
</body>
</html>`;

const QueueListScreen = () => {
  const navigation = useNavigation();
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [retrying, setRetrying] = useState(null);

  useFocusEffect(useCallback(() => { loadQueue(); }, []));

  const loadQueue = async () => {
    setLoading(true);
    try { setCaptures(await dbService.getQueue()); } catch (e) {}
    finally { setLoading(false); }
  };

  const filtered = captures.filter(c => filter === 'all' || c.sync_status === filter);
  const totalArea = captures.reduce((acc, c) => acc + (c.area_ha || 0), 0);
  const pendingCount = captures.filter(c => c.sync_status === 'pending').length;

  const handleRetry = async (item) => {
    setRetrying(item.id);
    try {
      const payload = {
        farm_id: item.farm_id,
        polygon_coordinates: item.polygon_coordinates,
        area_ha: item.area_ha,
        perimeter_meters: item.perimeter_meters,
        points_count: item.points_count,
        captured_at: item.captured_at,
        device_id: item.device_id,
        agent_id: item.agent_id,
        accuracy_m: item.accuracy_m,
      };
      const res = await polygonAPI.submit(payload);
      if (res.status === 200 || res.status === 201) {
        await dbService.updateSyncStatus(item.id, 'synced');
        loadQueue();
      } else {
        Alert.alert('Error', `Server returned ${res.status}`);
      }
    } catch (e) {
      Alert.alert('Network Error', 'Check your internet connection.');
    } finally {
      setRetrying(null);
    }
  };

  const handleSyncAll = async () => {
    if (pendingCount === 0) return;
    setLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        Alert.alert('Offline', 'Please connect to Wi-Fi or mobile data to sync.');
        return;
      }
      const { syncService } = require('../services/api');
      await syncService.syncPending();
      await loadQueue();
      Alert.alert('Sync Complete', 'All pending records have been processed.');
    } catch (e) {
      Alert.alert('Sync Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSynced = item.sync_status === 'synced';
    const isFailed = item.sync_status === 'failed';

    return (
      <View style={s.card}>
        <View style={s.cardImageContainer}>
           <WebView
             source={{ html: MINI_MAP_HTML }}
             style={s.cardThumb}
             scrollEnabled={false}
             injectedJavaScript={`
               setTimeout(function() {
                 window.dispatchEvent(new MessageEvent('message', {
                   data: JSON.stringify({
                     type: 'polygon',
                     coords: ${JSON.stringify(item.polygon_coordinates)}
                   })
                 }));
               }, 200);
               true;
             `}
           />
           <View style={[s.statusDot, isSynced ? s.dotSynced : isFailed ? s.dotFailed : s.dotPending]} />
        </View>

        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <Text style={s.farmId} numberOfLines={1}>{item.farm_id || 'Unknown ID'}</Text>
            <Text style={s.cardTime}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
            </Text>
          </View>

          <Text style={s.cardMeta}>
            {item.area_ha?.toFixed(4)} ha • {item.points_count} points
          </Text>

          <View style={s.statusRow}>
             <Text style={[s.statusLabel, isSynced && s.textSynced, isFailed && s.textFailed]}>
               {item.sync_status.toUpperCase()}
             </Text>
             <View style={s.cardActions}>
               <TouchableOpacity
                 style={s.viewBtn}
                 onPress={() => navigation.navigate('FarmConfirmation', { farmId: item.farm_id })}
               >
                 <Text style={s.viewBtnText}>View Details</Text>
               </TouchableOpacity>
               {isFailed && (
                 <TouchableOpacity
                   style={s.retryBtn}
                   onPress={() => handleRetry(item)}
                   disabled={retrying === item.id}
                 >
                   {retrying === item.id ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.retryBtnText}>Retry</Text>}
                 </TouchableOpacity>
               )}
             </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop' }}
        style={s.hero}
      >
        <View style={s.heroOverlay} />
        <SafeAreaView style={s.heroContent}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={s.logoBadge}>
               <Image source={require('../../assets/logo.jpeg')} style={s.logoBadgeImg} />
            </View>
          </View>

          <View style={s.heroStats}>
             <Text style={s.heroTitle}>Sync History</Text>
             <View style={s.statRow}>
                <View style={s.statBox}>
                   <Text style={s.statVal}>{captures.length}</Text>
                   <Text style={s.statLabel}>Records</Text>
                </View>
                <View style={s.vLine} />
                <View style={s.statBox}>
                   <Text style={s.statVal}>{totalArea.toFixed(2)}</Text>
                   <Text style={s.statLabel}>Total Ha</Text>
                </View>
                {pendingCount > 0 && (
                  <>
                    <View style={s.vLine} />
                    <TouchableOpacity style={s.statBox} onPress={handleSyncAll}>
                       <Text style={[s.statVal, { color: '#fbbf24' }]}>{pendingCount}</Text>
                       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={[s.statLabel, { color: '#fbbf24' }]}>Sync Now</Text>
                         <Text style={{ fontSize: 10, marginLeft: 4 }}>🔄</Text>
                       </View>
                    </TouchableOpacity>
                  </>
                )}
             </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <View style={s.main}>
        <View style={s.filterScroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContainer}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[s.filterTab, filter === f && s.filterTabActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={C.c700} /></View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={s.list}
            ListEmptyComponent={
              <View style={s.empty}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=400&auto=format&fit=crop' }}
                  style={s.emptyImg}
                />
                <Text style={s.emptyText}>No sync records found</Text>
              </View>
            }
          />
        )}
      </View>

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('FarmIDEntry')}>
        <Text style={s.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  hero: { height: 280, width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.6)' },
  heroContent: { flex: 1, padding: 24 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: C.white, fontSize: 18, fontWeight: 'bold' },
  logoBadge: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: C.white },
  logoBadgeImg: { width: '100%', height: '100%' },

  heroStats: { marginTop: 'auto' },
  heroTitle: { fontSize: 32, fontWeight: '800', color: C.white, marginBottom: 15 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginTop: 2 },
  vLine: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  main: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, paddingTop: 20 },
  filterScroll: { marginBottom: 15 },
  filterContainer: { paddingHorizontal: 24, gap: 10 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: C.steel100 },
  filterTabActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 14, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  list: { padding: 24, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: C.white, borderRadius: 24, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: C.steel100, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardImageContainer: { width: 80, height: 80, borderRadius: 18, marginRight: 15, position: 'relative', overflow: 'hidden', backgroundColor: C.steel100 },
  cardThumb: { width: '100%', height: '100%', borderRadius: 18 },
  statusDot: { position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.white, zIndex: 10 },
  dotSynced: { backgroundColor: C.syncedText },
  dotFailed: { backgroundColor: C.failedText },
  dotPending: { backgroundColor: '#fbbf24' },

  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  farmId: { fontSize: 16, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  cardTime: { fontSize: 12, color: C.muted, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: C.muted, fontWeight: '500', marginBottom: 6 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row', gap: 8 },
  viewBtn: { backgroundColor: C.steel200, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  viewBtnText: { color: C.steel700, fontSize: 11, fontWeight: '800' },
  statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#fbbf24' },
  textSynced: { color: C.syncedText },
  textFailed: { color: C.failedText },

  retryBtn: { backgroundColor: C.c700, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10 },
  retryBtnText: { color: C.white, fontSize: 11, fontWeight: '800' },

  center: { flex: 1, justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyImg: { width: 120, height: 120, borderRadius: 60, marginBottom: 20, opacity: 0.6 },
  emptyText: { color: C.subtle, fontWeight: '700', textAlign: 'center' },

  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
  fabIcon: { fontSize: 32, color: C.white, lineHeight: 36, fontWeight: '300' },
});

export default QueueListScreen;
