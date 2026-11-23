package main

import (
	"reflect"
	"testing"
)

func TestZipEntryNames(t *testing.T) {
	files := []zipFile{
		{FileName: "Kick In.wav"},
		{Title: "Bass", Format: "WAV"},
		{Title: "Lead / Vox", Format: "aif"},
		{FileName: "Kick In.wav"},
		{Key: "audio/abc.flac"},
		{FileName: "../../etc/passwd"},
	}
	want := []string{"Kick In.wav", "Bass.wav", "Lead - Vox.aif", "Kick In (2).wav", "abc.flac", "passwd"}
	if got := zipEntryNames(files); !reflect.DeepEqual(got, want) {
		t.Errorf("zipEntryNames = %q, want %q", got, want)
	}
}

func TestZipKinds(t *testing.T) {
	if zipKinds["stems"] != "Stem" || zipKinds["multitracks"] != "Multitrack" {
		t.Errorf("zipKinds = %v", zipKinds)
	}
	if _, ok := zipKinds["Full Mix"]; ok {
		t.Error("only stems and multitracks are zipped")
	}
}
