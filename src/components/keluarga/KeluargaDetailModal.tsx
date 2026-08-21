import React, { useState, useEffect } from 'react';
import { X, User, Heart, CreditCard, Calendar, Phone, MapPin, Sparkles, AlertCircle } from 'lucide-react';
import { Family } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDateIndo } from '../../lib/formatters.ts';
import { RTBadge } from '../common/Badge.tsx';

interface KeluargaDetailModalProps {
  familyId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (family: Family) => void;
  canEdit?: boolean;
}

export function KeluargaDetailModal({
  familyId,
  isOpen,
  onClose,
  onEdit,
  canEdit = false,
}: KeluargaDetailModalProps) {
  const [data, setData] = useState<{
    family: Family;
    member: { ID_Anggota: string; Nama: string; No_KK: string; RT: string; Status: string; Alamat: string } | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (familyId && isOpen) {
      const fetchDetail = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const res = await api.keluarga.get(familyId);
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError('Data keluarga tidak ditemukan.');
          }
        } catch (err: any) {
          setError(err.message || 'Gagal memuat detail keluarga.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchDetail();
    }
  }, [familyId, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="keluarga-detail-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="keluarga-detail-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Detail Anggota Keluarga
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                {familyId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Memuat rincian data keluarga...</p>
            </div>
          ) : error || !data ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error || 'Data tidak ditemukan.'}</span>
            </div>
          ) : (
            <>
              {/* Profile Top info */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{data.family.Nama}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-md text-[11px]">
                        Hubungan: {data.family.Hubungan}
                      </span>
                      <span
                        className={`px-2 py-0.5 font-semibold rounded-md text-[11px] ${
                          data.family.Status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Status: {data.family.Status}
                      </span>
                    </div>
                  </div>

                  {data.family.Calon_Ahli_Waris === 'Ya' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Calon Ahli Waris</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Data Anggota Utama */}
              {data.member && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                    <span>Anggota Utama Terkait</span>
                    <RTBadge rt={data.member.RT as any} />
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <p className="font-semibold text-slate-900">{data.member.Nama} ({data.member.ID_Anggota})</p>
                    <p className="text-slate-600">No. KK: <span className="font-mono font-medium">{data.member.No_KK}</span></p>
                    <p className="text-slate-600">Alamat: {data.member.Alamat}</p>
                  </div>
                </div>
              )}

              {/* Detail fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block text-xs mb-0.5">NIK (KTP/KIA)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {data.family.NIK || 'Belum diisi'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs mb-0.5">No. HP / WhatsApp</span>
                  <span className="font-semibold text-slate-900 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{data.family.No_HP || '-'}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs mb-0.5">Tempat & Tanggal Lahir</span>
                  <span className="font-medium text-slate-900">
                    {data.family.Tempat_Lahir ? `${data.family.Tempat_Lahir}, ` : ''}
                    {data.family.Tanggal_Lahir ? formatDateIndo(data.family.Tanggal_Lahir) : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs mb-0.5">Prioritas Ahli Waris</span>
                  <span className="font-medium text-slate-900">
                    {data.family.Calon_Ahli_Waris === 'Ya'
                      ? 'Penerima hak klaim santunan jika anggota utama meninggal'
                      : 'Bukan ahli waris utama'}
                  </span>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <span className="text-slate-500 block text-xs mb-1">Catatan / Keterangan</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  {data.family.Keterangan || 'Tidak ada catatan khusus.'}
                </p>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {canEdit && data && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(data.family);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Ubah Data Keluarga
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
